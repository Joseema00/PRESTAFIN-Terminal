import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_URL = 'https://prestafin.tech'

const ink = '#0B1625'
const muted = '#5B6672'
const gold = '#B89B5E'

const p: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '25px',
  color: ink,
  margin: '0 0 14px',
}
const quote: React.CSSProperties = {
  ...p,
  fontStyle: 'italic',
  color: muted,
  borderLeft: `2px solid ${gold}`,
  paddingLeft: '14px',
}
const h2: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '26px',
  color: ink,
  fontWeight: 600,
  margin: '30px 0 12px',
}
const li: React.CSSProperties = { ...p, margin: '0 0 6px', paddingLeft: '14px' }
const button: React.CSSProperties = {
  backgroundColor: ink,
  color: '#F7F4ED',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}

export interface WelcomeEmailProps {
  nombre?: string
}

export function WelcomeEmail({ nombre = 'Hola' }: WelcomeEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        Deja de gestionar tu hipoteca por inercia. Empieza a gestionar tu patrimonio con
        estrategia.
      </Preview>
      <Body style={{ backgroundColor: '#F7F4ED', margin: 0, fontFamily: 'Georgia, "Times New Roman", serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 28px' }}>
          <Text style={{ fontSize: '13px', letterSpacing: '3px', color: gold, margin: '0 0 22px' }}>
            PRESTAFIN
          </Text>

          <Text style={{ fontSize: '24px', lineHeight: '33px', color: ink, fontWeight: 600, margin: '0 0 24px' }}>
            Deja de gestionar tu hipoteca por inercia. Empieza a gestionar tu patrimonio con
            estrategia.
          </Text>

          <Text style={p}>Hola, {nombre} 👋</Text>

          <Text style={p}>
            Acabas de dar un paso importante: dejar de mirar tu hipoteca como una simple cuota
            mensual y empezar a verla como una parte de una estrategia financiera mucho más grande.
          </Text>

          <Text style={p}>Porque la pregunta realmente importante no es:</Text>
          <Text style={quote}>“¿Cuánto me queda de hipoteca?”</Text>
          <Text style={p}>La pregunta es:</Text>
          <Text style={quote}>
            “¿Qué puedo hacer con mi dinero para construir más patrimonio mientras la pago?”
          </Text>
          <Text style={p}>
            Y eso es exactamente lo que hemos creado Prestafin para ayudarte a explorar.
          </Text>

          <Text style={h2}>🏠 Tu hipoteca es solo una parte de tu patrimonio</Text>
          <Text style={p}>
            En Prestafin puedes analizar tu situación financiera desde una perspectiva global:
            hipoteca + ahorro + inversión + patrimonio + objetivos.
          </Text>
          <Text style={p}>Podrás explorar escenarios como:</Text>
          <Section>
            <Text style={li}>• ¿Me interesa amortizar?</Text>
            <Text style={li}>• ¿Invertir?</Text>
            <Text style={li}>• ¿Combinar ambas estrategias?</Text>
            <Text style={li}>• ¿Qué ocurre si aumento mis aportaciones?</Text>
            <Text style={li}>• ¿Cuándo podría mi patrimonio superar mi deuda?</Text>
            <Text style={li}>• Y mucho más.</Text>
          </Section>

          <Text style={h2}>📊 Descubre qué puede cambiar una decisión</Text>
          <Text style={p}>
            Con Prestafin puedes crear diferentes escenarios y visualizar cómo podrían evolucionar
            tu deuda y tu patrimonio a lo largo del tiempo.
          </Text>
          <Text style={p}>
            Y cuando estés preparado para ir más lejos, podrás utilizar herramientas avanzadas de
            análisis de carteras, simulaciones y métricas de riesgo para comprender mejor las
            distintas posibilidades.
          </Text>
          <Text style={p}>No se trata de adivinar el futuro.</Text>
          <Text style={p}>Se trata de entender mejor tus opciones.</Text>

          <Text style={h2}>🚀 Tu siguiente paso</Text>
          <Text style={p}>
            Completa ahora tus datos y empieza a construir tu escenario patrimonial.
          </Text>
          <Section style={{ margin: '20px 0 18px' }}>
            <Button href={`${SITE_URL}/mi-patrimonio`} style={button}>
              Empezar mi análisis →
            </Button>
          </Section>
          <Text style={p}>
            Cuanto más completa sea la información que introduzcas, más completa será la visión que
            podrás obtener de tu situación.
          </Text>

          <Text style={h2}>Y esto es solo el principio</Text>
          <Text style={p}>
            Prestafin está diseñado para acompañarte en el largo plazo. A medida que evolucione tu
            patrimonio, podrás seguir tu progreso, analizar nuevas situaciones y explorar cómo
            cambian los escenarios cuando cambian tus circunstancias.
          </Text>
          <Text style={p}>Porque construir patrimonio no es una decisión que tomas un día.</Text>
          <Text style={p}>Es un proceso.</Text>
          <Text style={p}>Y queremos ayudarte a entenderlo mejor.</Text>

          <Text style={{ ...p, fontWeight: 600 }}>Bienvenido a Prestafin.</Text>
          <Text style={p}>Tu patrimonio merece algo más que una cuota mensual.</Text>

          <Section style={{ margin: '20px 0 24px' }}>
            <Button href={SITE_URL} style={button}>
              Entrar en Prestafin →
            </Button>
          </Section>

          <Text style={p}>Un saludo,</Text>
          <Text style={p}>El equipo de Prestafin</Text>

          <Hr style={{ borderColor: '#E2DCD0', margin: '30px 0 16px' }} />
          <Text style={{ fontSize: '12px', lineHeight: '19px', color: muted, margin: 0 }}>
            Prestafin ofrece herramientas de análisis y simulación con finalidad educativa. Los
            resultados y escenarios no constituyen asesoramiento financiero personalizado ni
            garantizan rentabilidades futuras.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: WelcomeEmail,
  subject:
    'Deja de gestionar tu hipoteca por inercia. Empieza a gestionar tu patrimonio con estrategia.',
  displayName: 'Bienvenida a Prestafin',
  previewData: { nombre: 'José María' },
}

export default WelcomeEmail