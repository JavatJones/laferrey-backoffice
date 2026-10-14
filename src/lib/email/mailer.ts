import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import { getEmailEnv } from '@/lib/env'

let transporter: Transporter | null = null

const getTransporter = () => {
  if (transporter) return transporter
  const { host, port, secure, auth } = getEmailEnv()
  transporter = nodemailer.createTransport({ host, port, secure, auth, connectionTimeout: 10_000, socketTimeout: 20_000 })
  return transporter
}

export type OutgoingEmail = { to: string; subject: string; html: string; text: string }

export const sendEmail = async ({ to, subject, html, text }: OutgoingEmail) => {
  const { from } = getEmailEnv()
  await getTransporter().sendMail({ from, to, subject, html, text })
}
