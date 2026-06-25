const cron = require('node-cron');
const prisma = require('../prisma/client');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API);

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const inOneMin = new Date(now.getTime() + 60 * 1000);

  try {
    const due = await prisma.reminder.findMany({
      where: {
        scheduledAt: { gte: now, lte: inOneMin },
        sent: false,
      },
      include: { user: true },
    });
    for (const reminder of due) {
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