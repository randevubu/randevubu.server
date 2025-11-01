/**
 * Fix isSystem flag for Randevular (appointments) columns
 * 
 * This script updates existing revenue columns named "Randevular"
 * to have isSystem = true (they should be marked as system columns)
 */

import prisma from '../lib/prisma';
import logger from '../utils/Logger/logger';

async function fixRandevularSystemFlag() {
  try {
    logger.info('Starting fix for Randevular system flag...');

    // Find all Randevular columns that have isSystem = false
    const randevularColumns = await prisma.revenueColumn.findMany({
      where: {
        name: 'Randevular',
        isSystem: false
      }
    });

    logger.info(`Found ${randevularColumns.length} Randevular columns to fix`);

    if (randevularColumns.length === 0) {
      logger.info('No columns to fix. All Randevular columns already have correct isSystem flag.');
      return;
    }

    // Update each column to set isSystem = true
    const updatePromises = randevularColumns.map(column =>
      prisma.revenueColumn.update({
        where: { id: column.id },
        data: { isSystem: true }
      })
    );

    await Promise.all(updatePromises);

    logger.info(`✅ Successfully updated ${randevularColumns.length} Randevular columns`);
    logger.info('Randevular columns now correctly marked as system columns');

  } catch (error) {
    logger.error('Error fixing Randevular system flag:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixRandevularSystemFlag()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });


