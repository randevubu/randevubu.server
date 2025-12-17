module.exports = {
    // TypeScript files
    '*.ts': [
        // Run TypeScript compiler check (no emit, just type checking)
        () => 'tsc --noEmit',
        // Format files
        'prettier --write',
    ],

    // Prisma schema files
    'prisma/schema.prisma': [
        // Format Prisma schema
        'npx prisma format',
    ],

    // JSON files
    '*.json': [
        'prettier --write',
    ],

    // Markdown files
    '*.md': [
        'prettier --write',
    ],
};
