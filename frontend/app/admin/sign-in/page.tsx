import AdminSignInForm from './AdminSignInForm'

export default function AdminSignInPage() {
  const demoPassword = process.env.ADMIN_DEMO_PASSWORD ?? null
  return <AdminSignInForm demoPassword={demoPassword} />
}
