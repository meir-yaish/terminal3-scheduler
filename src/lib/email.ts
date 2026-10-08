import nodemailer from 'nodemailer'

export async function sendEmail({
  to, subject, html, attachments
}: {
  to: string[]
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer | string }[]
}) {
  const from = process.env.GMAIL_FROM
  const password = process.env.GMAIL_APP_PASSWORD
  if (!from || !password) {
    throw new Error('חסרים משתני סביבה GMAIL_FROM / GMAIL_APP_PASSWORD')
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: from, pass: password }
  })

  await transporter.sendMail({
    from,
    to: to.join(', '),
    subject,
    html,
    attachments
  })
}
