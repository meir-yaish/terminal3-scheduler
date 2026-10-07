import nodemailer from 'nodemailer'

export async function sendEmail({
  from, password, to, subject, html, attachments
}: {
  from: string
  password: string
  to: string[]
  subject: string
  html: string
  attachments?: any[]
}) {
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
