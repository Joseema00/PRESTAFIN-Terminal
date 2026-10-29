import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/app/site-header";
import { BrandMark } from "@/components/app/brand-mark";
import { Button } from "@/components/ui/button";

const TITLE = "Política de Privacidad — Prestafin";
const DESCRIPTION = "Información sobre cómo Prestafin recoge, utiliza y protege tus datos personales.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-24 lg:px-10">
        <div className="space-y-6">
          <p className="eyebrow">Legal</p>
          <h1 className="font-display text-3xl sm:text-4xl">Política de Privacidad</h1>
          <p className="text-sm text-muted-foreground">Última actualización: agosto de 2026</p>
        </div>

        <div className="prose prose-muted mt-12 space-y-8 text-muted-foreground">
          <section>
            <h2 className="font-display text-xl text-foreground">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de tus datos personales es <strong>Prestafin</strong>.
              Para cualquier cuestión relativa a esta política puedes contactarnos a través de los canales
              disponibles en tu área de cuenta o en el pie de página de la web.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">2. Datos que recogemos</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Datos de cuenta:</strong> nombre, dirección de correo electrónico y credenciales de
                acceso cifradas.
              </li>
              <li>
                <strong>Datos de perfil financiero:</strong> características de tu préstamo, aportaciones
                mensuales, carteras de inversión y simulaciones que guardes voluntariamente.
              </li>
              <li>
                <strong>Datos de uso:</strong> registros de actividad, preferencias de configuración e
                información técnica necesaria para la seguridad y el funcionamiento del servicio.
              </li>
              <li>
                <strong>Datos de pago:</strong> Prestafin no almacena datos de tarjetas ni cuentas bancarias.
                Los pagos y la gestión de suscripciones se procesan a través de Stripe, nuestro proveedor de
                pagos y Merchant of Record para la gestión de cobros, facturación y cumplimiento fiscal.

              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">3. Finalidades del tratamiento</h2>
            <p>Utilizamos tus datos para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Crear y mantener tu cuenta de usuario.</li>
              <li>Prestarte el servicio de simulación y análisis patrimonial.</li>
              <li>Permitirte guardar, recuperar y sincronizar tus datos entre dispositivos.</li>
              <li>Mejorar la seguridad, prevenir fraudes y resolver incidencias.</li>
              <li>Enviarte comunicaciones esenciales relacionadas con el servicio o, si lo autorizas,
                comunicaciones comerciales.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">4. Base legal</h2>
            <p>
              El tratamiento se basa en la ejecución del contrato de prestación de servicios (cuenta y
              suscripción), el cumplimiento de obligaciones legales, nuestro interés legítimo en garantizar la
              seguridad y calidad del servicio, y, en su caso, el consentimiento que nos otorgues para
              comunicaciones comerciales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">5. Destinatarios de los datos</h2>
            <p>
              Prestafin comparte datos únicamente con proveedores de confianza que actúan como
              encargados del tratamiento (hosting, soporte, análisis) y con Stripe como Merchant of Record
              para la gestión de pagos, suscripciones, facturación y cumplimiento fiscal. No vendemos tus datos
              a terceros.

            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">6. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas apropiadas, incluidos cifrado en tránsito y en
              reposo, controles de acceso, segmentación por usuario y auditoría regular, para proteger tus
              datos contra accesos no autorizados, alteraciones o pérdidas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">7. Retención</h2>
            <p>
              Conservamos tus datos mientras mantengas una cuenta activa o sea necesario para cumplir con
              obligaciones legales. Si decides eliminar tu cuenta, procederemos a la supresión o anonimización
              de tus datos en un plazo razonable, salvo que la normativa aplicable exija su conservación.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">8. Derechos de los usuarios</h2>
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación, oposición y
              portabilidad contactando con nosotros. Si resides en el Espacio Económico Europeo, también tienes
              derecho a presentar una reclamación ante la autoridad de control de protección de datos de tu
              país.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">9. Cookies y tecnologías similares</h2>
            <p>
              Prestafin utiliza cookies esenciales para el funcionamiento y la seguridad de la plataforma. En
              su caso, empleamos cookies analíticas y de rendimiento para entender cómo se usa el servicio,
              siempre que hayas dado tu consentimiento. Puedes gestionar tus preferencias desde la
              configuración de tu navegador.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">10. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa. Te
              recomendamos revisarla periódicamente. Las modificaciones relevantes serán comunicadas a través de
              la plataforma o por correo electrónico.
            </p>
          </section>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
          <BrandMark size={28} />
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
