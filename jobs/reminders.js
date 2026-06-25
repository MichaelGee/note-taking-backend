const cron = require('node-cron');
const prisma = require('../prisma/client');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API);

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const inOneMin = new Date(now.getTime() + 60 * 1000);

  console.log(
    `Cron tick: checking reminders between ${now.toISOString()} and ${inOneMin.toISOString()}`,
  );

  try {
    const due = await prisma.reminder.findMany({
      where: {
        scheduledAt: { gte: now, lte: inOneMin },
        sent: false,
      },
      include: { user: true },
    });

    console.log(`Found ${due.length} due reminders`);

    for (const reminder of due) {
      console.log(`Sending reminder ${reminder.id} to ${reminder.user.email}`);

      await resend.emails.send({
        from: 'MemoryPal <onboarding@resend.dev>',
        to: reminder.user.email,
        subject: 'Reminder',
        html: `<p>${reminder.text}</p>`,
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { sent: true },
      });

      console.log(`Reminder sent to ${reminder.user.email}: ${reminder.text}`);
    }
  } catch (e) {
    console.error('Reminder job error:', e.message);
    console.error(e); // log the full error, not just the message
  }
});