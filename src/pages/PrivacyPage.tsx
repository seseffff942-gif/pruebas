import React from 'react';
import { User } from '../types';
import { APP_NAME } from '../config';

interface PrivacyPageProps {
  user: User;
  isMobile?: boolean;
}

export function PrivacyPage({ user, isMobile }: PrivacyPageProps) {
  return (
    <div className={`max-w-4xl mx-auto flex flex-col ${isMobile ? 'p-4 h-full space-y-4' : 'p-8'}`}>
      <div className={`flex flex-col gap-2 ${isMobile ? 'mb-4' : 'mb-8'}`}>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Política de Privacidad</h1>
        <p className="text-slate-500 font-medium">Última actualización: 2026</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 text-slate-700 space-y-6 leading-relaxed overflow-y-auto flex-1">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Información que Recopilamos</h2>
          <p>
            En {APP_NAME} recopilamos únicamente la información necesaria para gestionar el inventario, realizar transacciones comerciales y mantener el contacto con nuestros clientes. Esto puede incluir nombres, direcciones, números de teléfono y detalles de compras realizadas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Uso de la Información</h2>
          <p>
            Utilizamos la información recopilada para operar y mantener nuestro sistema de ventas e inventario, procesar transacciones, comunicarnos con los clientes respecto a sus pedidos e implementar mejoras en nuestros servicios. No vendemos ni compartimos información a terceros con fines de marketing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Protección de Datos</h2>
          <p>
            Implementamos medidas de seguridad para proteger la información contra acceso no autorizado, alteración, divulgación o destrucción. Limitamos el acceso a la información personal a aquellos empleados que necesitan conocerla para operar, desarrollar o mejorar nuestros servicios.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Retención de Datos</h2>
          <p>
            Mantendremos su información personal durante el tiempo que sea necesario para cumplir con los fines descritos en esta Política de Privacidad, a menos que la ley exija o permita un período de retención más prolongado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Contacto</h2>
          <p>
            Si tiene alguna pregunta sobre esta Política de Privacidad, por favor comuníquese con la administración del sistema.
          </p>
        </section>

      </div>
    </div>
  );
}
