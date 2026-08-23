import { PrismaClient, Role, HospitalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seeds one complete tenant end to end so Week 1's auth + RBAC can be
 * exercised immediately without going through the onboarding API by
 * hand. Password for every seeded account is "Password123!" — change
 * before this ever touches a shared environment.
 */
async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@medcore.dev' },
    update: {},
    create: {
      email: 'superadmin@medcore.dev',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });

  const hospital = await prisma.hospital.upsert({
    where: { slug: 'city-general' },
    update: {},
    create: {
      name: 'City General Hospital',
      slug: 'city-general',
      status: HospitalStatus.ACTIVE,
      email: 'contact@citygeneral.dev',
    },
  });

  const hospitalAdmin = await prisma.user.upsert({
    where: { email: 'admin@citygeneral.dev' },
    update: {},
    create: {
      email: 'admin@citygeneral.dev',
      passwordHash,
      firstName: 'Hospital',
      lastName: 'Admin',
      role: Role.HOSPITAL_ADMIN,
      hospitalId: hospital.id,
      isEmailVerified: true,
    },
  });

  const department = await prisma.department.upsert({
    where: { hospitalId_name: { hospitalId: hospital.id, name: 'General Medicine' } },
    update: {},
    create: { hospitalId: hospital.id, name: 'General Medicine' },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@citygeneral.dev' },
    update: {},
    create: {
      email: 'doctor@citygeneral.dev',
      passwordHash,
      firstName: 'Asha',
      lastName: 'Rao',
      role: Role.DOCTOR,
      hospitalId: hospital.id,
      isEmailVerified: true,
    },
  });

  await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: { userId: doctorUser.id, departmentId: department.id, specialty: 'General Physician' },
  });

  const doctorProfile = await prisma.doctor.findUniqueOrThrow({ where: { userId: doctorUser.id } });

  // Mon-Fri 9:00-13:00, 15-minute slots, so Week 2's booking flow has
  // something real to test against right after seeding.
  await prisma.availability.deleteMany({ where: { doctorId: doctorProfile.id } });
  await prisma.availability.createMany({
    data: [1, 2, 3, 4, 5].map((weekday) => ({
      doctorId: doctorProfile.id,
      weekday,
      startTime: '09:00',
      endTime: '13:00',
      slotMins: 15,
    })),
  });

  const receptionistUser = await prisma.user.upsert({
    where: { email: 'reception@citygeneral.dev' },
    update: {},
    create: {
      email: 'reception@citygeneral.dev',
      passwordHash,
      firstName: 'Meera',
      lastName: 'Iyer',
      role: Role.RECEPTIONIST,
      hospitalId: hospital.id,
      isEmailVerified: true,
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@example.dev' },
    update: {},
    create: {
      email: 'patient@example.dev',
      passwordHash,
      firstName: 'Kartik',
      lastName: 'Deshmukh',
      role: Role.PATIENT,
      isEmailVerified: true,
    },
  });

  await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: { userId: patientUser.id, gender: 'M' },
  });

  // --- Week 3: pharmacy, lab, and billing staff + catalogs ---

  const pharmacistUser = await prisma.user.upsert({
    where: { email: 'pharmacist@citygeneral.dev' },
    update: {},
    create: {
      email: 'pharmacist@citygeneral.dev',
      passwordHash,
      firstName: 'Rohan',
      lastName: 'Verma',
      role: Role.PHARMACIST,
      hospitalId: hospital.id,
      isEmailVerified: true,
    },
  });

  const labTechUser = await prisma.user.upsert({
    where: { email: 'labtech@citygeneral.dev' },
    update: {},
    create: {
      email: 'labtech@citygeneral.dev',
      passwordHash,
      firstName: 'Divya',
      lastName: 'Menon',
      role: Role.LAB_TECHNICIAN,
      hospitalId: hospital.id,
      isEmailVerified: true,
    },
  });

  const accountantUser = await prisma.user.upsert({
    where: { email: 'accountant@citygeneral.dev' },
    update: {},
    create: {
      email: 'accountant@citygeneral.dev',
      passwordHash,
      firstName: 'Sanjay',
      lastName: 'Gupta',
      role: Role.ACCOUNTANT,
      hospitalId: hospital.id,
      isEmailVerified: true,
    },
  });

  const paracetamol = await prisma.medicine.upsert({
    where: { id: 'seed-medicine-paracetamol' },
    update: {},
    create: {
      id: 'seed-medicine-paracetamol',
      hospitalId: hospital.id,
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      form: 'tablet',
      strength: '500mg',
      stockQty: 200,
      reorderLevel: 20,
      unitPrice: 2.5,
    },
  });

  await prisma.medicine.upsert({
    where: { id: 'seed-medicine-amoxicillin' },
    update: {},
    create: {
      id: 'seed-medicine-amoxicillin',
      hospitalId: hospital.id,
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      form: 'capsule',
      strength: '250mg',
      stockQty: 80,
      reorderLevel: 15,
      unitPrice: 6,
    },
  });

  const cbc = await prisma.labTest.upsert({
    where: { id: 'seed-labtest-cbc' },
    update: {},
    create: {
      id: 'seed-labtest-cbc',
      hospitalId: hospital.id,
      name: 'Complete Blood Count',
      code: 'CBC',
      price: 15,
      turnaroundHrs: 24,
    },
  });

  await prisma.labTest.upsert({
    where: { id: 'seed-labtest-lipid' },
    update: {},
    create: {
      id: 'seed-labtest-lipid',
      hospitalId: hospital.id,
      name: 'Lipid Profile',
      code: 'LIPID',
      price: 25,
      turnaroundHrs: 24,
    },
  });

  console.log('Seed complete:');
  console.log(`  Super Admin  -> ${superAdmin.email}`);
  console.log(`  Hospital     -> ${hospital.name} (${hospital.slug})`);
  console.log(`  Hospital Admin -> ${hospitalAdmin.email}`);
  console.log(`  Doctor       -> ${doctorUser.email} (Mon-Fri 9:00-13:00, 15-min slots)`);
  console.log(`  Receptionist -> ${receptionistUser.email}`);
  console.log(`  Pharmacist   -> ${pharmacistUser.email}`);
  console.log(`  Lab Technician -> ${labTechUser.email}`);
  console.log(`  Accountant   -> ${accountantUser.email}`);
  console.log(`  Patient      -> ${patientUser.email}`);
  console.log(`  Medicine     -> ${paracetamol.name} (id: ${paracetamol.id})`);
  console.log(`  Lab Test     -> ${cbc.name} (id: ${cbc.id})`);
  console.log('  Password for all seeded accounts: Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
