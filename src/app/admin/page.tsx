import { AdminHeader } from "@/components/admin/AdminHeader";
import { CargadorCatalogo } from "@/components/admin/CargadorCatalogo";
import { RevertirRespaldo } from "@/components/admin/RevertirRespaldo";
import Link from "next/link";

export const metadata = { title: "Panel de administración" };

export default function PaginaAdmin() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <CargadorCatalogo />
        <RevertirRespaldo />
        <p className="mt-6 text-center text-xs text-ink-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Ver catálogo público
          </Link>
        </p>
      </main>
    </>
  );
}
