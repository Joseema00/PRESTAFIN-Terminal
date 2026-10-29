import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/app/site-header";
import { BrandMark } from "@/components/app/brand-mark";
import { Button } from "@/components/ui/button";

const TITLE = "Política de Reembolsos — Prestafin";
const DESCRIPTION = "Condiciones de garantía de reembolso y devoluciones de Prestafin.";

export const Route = createFileRoute("/refund")({
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
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-24 lg:px-10">
        <div className="space-y-6">
          <p className="eyebrow">Legal</p>
          <h1 className="font-display text-3xl sm:text-4xl">Política de Reembolsos</h1>
          <p className="text-sm text-muted-foreground">Última actualización: agosto de 2026</p>
        </div>

        <div className="prose prose-muted mt-12 space-y-8 text-muted-foreground">
          <section>
            <h2 className="font-display text-xl text-foreground">Garantía de satisfacción</h2>
            <p>
              En Prestafin queremos que te sientas seguro con tu decisión. Por eso, si contratas un plan de
              pago y no quedas satisfecho, puedes solicitar un reembolso completo durante los primeros{" "}
              <strong>30 días</strong> desde la fecha de compra.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Cómo solicitar un reembolso</h2>
            <p>
              Para pedir un reembolso, contacta con nosotros a través de los canales de soporte disponibles
              en tu área de cuenta o en el pie de página de la web. También puedes gestionar tu solicitud
              directamente con Stripe, nuestro proveedor de pagos y Merchant of Record, a través de{" "}
              <a
                href="https://support.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
              >
                support.stripe.com
              </a>
              .

            </p>
            <p>
              Indica en tu solicitud la dirección de correo electrónico asociada a tu cuenta y, si es
              posible, el número de pedido o la referencia de la transacción. Responderemos en un plazo
              razonable y procesaremos el reembolso a través del mismo método de pago utilizado en la
              compra.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Plazo y condiciones</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Los reembolsos por insatisfacción se admiten dentro de los 30 días siguientes al pago.</li>
              <li>
                Los reembolsos se tramitan por el importe total del periodo pagado, salvo que hayas consumido
                servicios adicionales de pago por uso no incluidos en la suscripción.
              </li>
              <li>
                Si solicitas un reembolso tras el periodo de 30 días, evaluaremos cada caso de forma
                individual; no obstante, no existe obligación de devolución fuera del periodo de garantía.
              </li>
              <li>
                El abuso reiterado de esta política o el uso fraudulento del Servicio puede comportar la
                denegación de futuras solicitudes y la suspensión de la cuenta.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Cancelación de suscripción</h2>
            <p>
              Puedes cancelar tu suscripción en cualquier momento desde tu área de cuenta. La cancelación se
              hace efectiva al finalizar el periodo de facturación en curso, por lo que seguirás teniendo
              acceso a las funciones de pago hasta esa fecha. No se realizan reembolsos prorrateados por
              cancelaciones anticipadas voluntarias dentro de un periodo de facturación ya pagado, salvo que
              apliquen los 30 días de garantía desde la compra.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Procesador de pagos</h2>
            <p>
              Nuestro proceso de pedidos se realiza a través de Stripe, nuestro proveedor de pagos y Merchant
              of Record para todos nuestros pedidos. Stripe gestiona los pagos, la facturación, los impuestos y
              las devoluciones. Para más información sobre cómo Stripe maneja las devoluciones, puedes
              consultar su{" "}
              <a
                href="https://stripe.com/legal/refund-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
              >
                política de reembolsos
              </a>
              .
            </p>

          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Cambios en esta política</h2>
            <p>
              Prestafin puede actualizar esta política para ajustarla a cambios en el servicio o en la
              normativa. Cualquier modificación relevante será publicada en esta página y, si procede,
              comunicada a los usuarios afectados.
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
