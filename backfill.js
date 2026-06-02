const { PrismaClient } = require('@prisma/client');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION });
const bucket = process.env.AWS_S3_BUCKET_NAME;
const BID = 'biz_1778786845047_bubxoe0w';

async function getSize(url) {
  try {
    const key = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return res.ContentLength || 0;
  } catch(e) { console.log('S3 error for', url.slice(-30), ':', e.message); return 0; }
}

async function run() {
  const biz = await prisma.business.findUnique({
    where: { id: BID },
    select: { galleryImages: true, logoUrl: true, coverImageUrl: true, profileImageUrl: true }
  });
  const all = [
    ...(biz.galleryImages || []).map(u => ({ url: u, type: 'gallery' })),
    ...(biz.logoUrl ? [{ url: biz.logoUrl, type: 'logo' }] : []),
    ...(biz.coverImageUrl ? [{ url: biz.coverImageUrl, type: 'cover' }] : []),
    ...(biz.profileImageUrl ? [{ url: biz.profileImageUrl, type: 'profile' }] : []),
  ];
  let total = 0;
  for (const item of all) {
    const sz = await getSize(item.url);
    total += sz;
    const existing = await prisma.businessImage.findFirst({ where: { url: item.url, businessId: BID }});
    if (!existing) {
      const id = 'img_bf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      await prisma.businessImage.create({ data: { id, businessId: BID, url: item.url, type: item.type, fileSizeBytes: sz }});
    }
    console.log(item.type, sz + 'B');
  }
  const mb = Math.ceil(total / (1024 * 1024));
  const now = new Date(); const mo = now.getMonth() + 1; const yr = now.getFullYear();
  await prisma.businessUsage.upsert({
    where: { businessId_month_year: { businessId: BID, month: mo, year: yr }},
    update: { storageUsedMB: mb },
    create: { id: 'usage_bf_' + BID + mo, businessId: BID, month: mo, year: yr, storageUsedMB: mb }
  });
  console.log('Done. Total:', total, 'bytes =', mb, 'MB');
}
run().catch(e => console.error(e.message)).finally(() => prisma.$disconnect());
