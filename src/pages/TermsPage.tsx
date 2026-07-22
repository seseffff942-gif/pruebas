import React from 'react';
import { User } from '../types';
import { APP_NAME } from '../config';

interface TermsPageProps {
  user: User;
  isMobile?: boolean;
}

export function TermsPage({ user, isMobile }: TermsPageProps) {
  return (
    <div className={`max-w-4xl mx-auto flex flex-col ${isMobile ? 'p-4 h-full space-y-4' : 'p-8'}`}>
      <div className={`flex flex-col gap-2 ${isMobile ? 'mb-4' : 'mb-8'}`}>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Términos y Condiciones</h1>
        <p className="text-slate-500 font-medium">Última actualización: 2026</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 text-slate-700 space-y-6 leading-relaxed overflow-y-auto flex-1">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar el sistema {APP_NAME}, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al sistema.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Uso de la Aplicación</h2>
          <p>
            El sistema está destinado para el uso exclusivo de colaboradores y usuarios autorizados. El uso de la plataforma para fines ajenos a los comerciales de la empresa, o la manipulación de la información sin la debida autorización, está estrictamente prohibido.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Privacidad y Datos de Usuarios</h2>
          <p>
            Toda la información registrada, tanto de clientes como de productos, es propiedad de la organización. Nos comprometemos a proteger la privacidad de los datos personales ingresados en el sistema.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Responsabilidad</h2>
          <p>
            Cada usuario es responsable de mantener la confidencialidad de sus credenciales de acceso. La empresa no se hace responsable de las pérdidas de datos o daños derivados del mal uso de las cuentas o de la compartición de contraseñas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Modificación de los Términos</h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en el sistema.
          </p>
        </section>

      </div>
    </div>
  );
}
