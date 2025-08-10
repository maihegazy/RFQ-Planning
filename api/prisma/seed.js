const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@rfqsystem.local' },
      update: {},
      create: {
        email: 'admin@rfqsystem.local',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
      },
    });
    
    console.log('✅ Created admin user:', admin.email);

    // Create reference data for cost centers (required)
    const costCenters = ['BCC', 'HCC', 'MCC'];
    const currentYear = new Date().getFullYear();
    
    // Create sample cost rates
    for (const center of costCenters) {
      const existingRate = await prisma.rateCost.findFirst({
        where: {
          costCenter: center,
          effectiveFrom: { lte: new Date() },
          effectiveTo: { gte: new Date() },
        },
      });

      if (!existingRate) {
        const rate = await prisma.rateCost.create({
          data: {
            costCenter: center,
            effectiveFrom: new Date(currentYear, 0, 1),
            effectiveTo: new Date(currentYear, 11, 31),
            costPerHour: center === 'BCC' ? 35 : center === 'HCC' ? 45 : 55,
          },
        });
        console.log(`✅ Created cost rate for ${center}: €${rate.costPerHour}/h`);
      }
    }

    // Create sample sell rates
    const levels = ['Junior', 'Standard', 'Senior', 'Principal'];
    const useCases = ['UC1', 'UC2', 'UC3'];
    
    for (const center of costCenters) {
      for (const level of levels) {
        for (const useCase of useCases) {
          const existingRate = await prisma.rateSell.findFirst({
            where: {
              location: center,
              level,
              useCase,
              effectiveFrom: { lte: new Date() },
              effectiveTo: { gte: new Date() },
            },
          });

          if (!existingRate) {
            const baseRate = 
              level === 'Junior' ? 50 :
              level === 'Standard' ? 65 :
              level === 'Senior' ? 80 :
              95;
            
            const locationMultiplier = 
              center === 'BCC' ? 0.8 :
              center === 'HCC' ? 1.0 :
              1.2;
            
            const useCaseMultiplier = 
              useCase === 'UC1' ? 1.2 :
              useCase === 'UC2' ? 1.0 :
              0.9;

            await prisma.rateSell.create({
              data: {
                location: center,
                level,
                useCase,
                effectiveFrom: new Date(currentYear, 0, 1),
                effectiveTo: new Date(currentYear, 11, 31),
                sellPerHour: Math.round(baseRate * locationMultiplier * useCaseMultiplier),
              },
            });
          }
        }
      }
    }
    
    console.log('✅ Created sell rates for all combinations');

    // Create sample users for testing (optional - comment out in production)
    if (process.env.NODE_ENV === 'development') {
      const testUsers = [
        { email: 'dm@test.com', name: 'David Manager', role: 'DELIVERY_MANAGER' },
        { email: 'gm@test.com', name: 'Grace Manager', role: 'GENERAL_MANAGER' },
        { email: 'em@test.com', name: 'Emma Manager', role: 'ENGINEERING_MANAGER' },
        { email: 'pl@test.com', name: 'Paul Leader', role: 'PROJECT_LEADER' },
        { email: 'tl@test.com', name: 'Tom Leader', role: 'TEAM_LEADER' },
        { email: 'tech@test.com', name: 'Terry Technical', role: 'TECHNICAL_LEADER' },
        { email: 'reviewer@test.com', name: 'Rachel Reviewer', role: 'TECHNICAL_REVIEWER' },
      ];

      for (const userData of testUsers) {
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {},
          create: {
            ...userData,
            password: hashedPassword, // Same password for all test users
            active: true,
          },
        });
        console.log(`✅ Created test user: ${user.email}`);
      }
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });