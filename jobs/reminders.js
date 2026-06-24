const cron = require('node-cron');
const prisma = require('../prisma/client');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API);

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const inOneMin =  new Date(now.getTime() + 60 * 1000);
  try{
    // Find reminders due in the next minute that haven't been sent
    const due = await prisma.reminder.findMany({
      where: {
        scheduledAt: { gte: now, lte: inOneMin },
        sent: false,
      },
      include: { user: true }, // join the user so we have their email
    });

    for (const reminder of due) {
      await resend.emails.send({
        from: 'MempryPal <onboarding@resend.dev>',
        to: reminder.user.email,
        subject: 'Reminder',
        html: `<p>${reminder.text}</p>`,
      });
      // Mark as sent so it doesn't fire again
      await prisma.reminder.update({
        where: {id: reminder.id},
        data: {sent: true},
      })
      console.log(`Reminder sent to ${reminder.user.email}: ${reminder.text}`);
    }
  }catch (e) {
  console.error('Reminder job error:', e.message);
  }
})