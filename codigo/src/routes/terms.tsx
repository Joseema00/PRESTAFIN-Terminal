import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/app/site-header";
import { BrandMark } from "@/components/app/brand-mark";
import { Button } from "@/components/ui/button";

const TITLE = "Términos de Servicio — Prestafin";
const DESCRIPTION = "Términos y condiciones de uso del servicio Prestafin.";

export const Route = createFileRoute("/terms")({
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
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-24 lg:px-10">
        <div className="space-y-6">
          <p className="eyebrow">Legal</p>
          <h1 className="font-display text-3xl sm:text-4xl">Términos de Servicio</h1>
          <p className="text-sm text-muted-foreground">Última actualización: agosto de 2026</p>
        </div>

        <div className="prose prose-muted mt-12 space-y-8 text-muted-foreground">
          <section>
            <h2 className="font-display text-xl text-foreground">1. Identificación del prestador</h2>
            <p>
              El servicio Prestafin (en adelante, "el Servicio") es prestado por <strong>Prestafin</strong>
              (en adelante, "nosotros" o "el vendedor"). Al acceder o utilizar Prestafin, aceptas quedar
              vinculado por estos Términos de Servicio. Si no estás de acuerdo con ellos, no utilices el
              Servicio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">2. Descripción del servicio</h2>
            <p>
              Prestafin es una plataforma de análisis, simulación y visualización patrimonial dirigida a
              personas que gestionan un préstamo junto con su cartera de inversión. El Servicio genera
              escenarios, comparativas y métricas educativas a partir de los datos introducidos por el
              usuario. En ningún caso Prestafin constituye asesoramiento financiero, fiscal, de inversión o
              hipotecario personalizado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">3. Condiciones de uso</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Debes ser mayor de edad y tener capacidad legal para contratar, o contar con la autorización
                de quien ostente la patria potestad o tutela correspondiente.
              </li>
              <li>
                Debes proporcionar información veraz, actualizada y completa al registrarte y mantenerla
                actualizada.
              </li>
              <li>
                Eres responsable de la confidencialidad de tus credenciales y de toda actividad que ocurra
                bajo tu cuenta.
              </li>
              <li>
                No debes utilizar el Servicio para actividades ilícitas, fraudulentas, no autorizadas o que
                infrinjan derechos de terceros.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">4. Propiedad intelectual</h2>
            <p>
              Prestafin retiene todos los derechos de propiedad intelectual e industrial sobre el software,
              diseños, marcas, textos, gráficos, bases de datos y cualquier otro contenido propio de la
              plataforma. Se te concede una licencia limitada, no exclusiva, no transferible y revocable para
              utilizar el Servicio conforme a tu plan contratado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">5. Planes, pagos y renovaciones</h2>
            <p>
              Prestafin ofrece planes gratuitos y de pago. Los pagos, la facturación, el cálculo y
              repercusión de impuestos, la gestión de suscripciones y las renovaciones son procesados por
              Stripe, nuestro proveedor de pagos y Merchant of Record (comerciante de registro) para todos
              nuestros pedidos. Stripe también gestiona las consultas de atención al cliente relacionadas con
              pagos y las devoluciones.
            </p>
            <p>
              Al contratar un plan de pago, autorizas a Stripe a cargar la cuota correspondiente en la forma
              de pago y periodicidad del plan elegido. Las suscripciones se renuevan automáticamente salvo que
              se cancelen con antelación desde tu área de cuenta.
            </p>
            <p>
              Para los términos aplicables a compradores de Stripe, consulta los{" "}
              <a
                href="https://stripe.com/legal/checkout-buyer-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
              >
                Stripe Buyer Terms
              </a>
              .
            </p>

          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">6. Cancelación y terminación</h2>
            <p>
              Puedes cancelar tu suscripción en cualquier momento desde tu área de cuenta. La cancelación
              se aplicará al final del periodo de facturación en curso. Prestafin se reserva el derecho de
              suspender o cancelar tu acceso con efectos inmediatos si incumples estos términos, realizas un
              uso fraudulento o supones un riesgo para la seguridad del Servicio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">7. Limitación de responsabilidad</h2>
            <p>
              Prestafin se proporciona "tal cual" y "según disponibilidad". No garantizamos que el Servicio
              sea ininterrumpido, libre de errores o apto para un propósito específico. Las simulaciones son
              estimaciones educativas basadas en datos introducidos por el usuario y en parámetros
              históricos; las rentabilidades pasadas no garantizan rentabilidades futuras.
            </p>
            <p>
              En la máxima medida permitida por la ley, la responsabilidad agregada de Prestafin por el uso
              del Servicio se limitará al importe abonado por el usuario en los doce meses anteriores al
              evento causante. No seremos responsables de daños indirectos, emergentes, especiales o
              consecuenciales, incluidos lucro cesante o pérdida de datos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">8. Indemnización</h2>
            <p>
              Aceptas indemnizar y mantener indemne a Prestafin frente a reclamaciones, daños, pérdidas y
              gastos derivados de tu uso indebido del Servicio, de la información que introduzcas o de tu
              incumplimiento de estos términos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">9. Modificaciones</h2>
            <p>
              Podemos actualizar estos Términos de Servicio en cualquier momento. Te notificaremos los
              cambios materiales a través del Servicio o por correo electrónico. El uso continuado del
              Servicio tras la publicación de los cambios implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">10. Ley aplicable y jurisdicción</h2>
            <p>
              Estos términos se regirán por la legislación aplicable del país de residencia del vendedor,
              sin perjuicio de los derechos que como consumidor te puedan corresponder. Cualquier disputa
              derivada del Servicio se someterá a los tribunales competentes de dicha jurisdicción.
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
