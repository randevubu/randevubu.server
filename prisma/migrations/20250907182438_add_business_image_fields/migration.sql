-- AlterTable
ALTER TABLE "public"."businesses" ADD COLUMN     "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profileImageUrl" TEXT;
