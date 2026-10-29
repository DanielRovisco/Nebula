import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

export interface MagicLinkProps {
  url: string;
  host: string;
}

const brand = "#1d3fb5";

export function MagicLinkEmail({ url, host }: MagicLinkProps) {
  return (
    <Html lang="pt-PT">
      <Head />
      <Preview>A sua ligação de acesso à Praça</Preview>
      <Body style={{ background: "#f5f4f1", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ background: "#ffffff", borderRadius: 16, maxWidth: 480, padding: 32, border: "1px solid #dfdcd5" }}>
          <Text style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1917" }}>Praça</Text>
          <Heading as="h1" style={{ fontSize: 22, margin: "24px 0 8px", color: "#1a1917" }}>
            Entrar na Praça
          </Heading>
          <Text style={{ color: "#625e57", fontSize: 15, lineHeight: "22px" }}>
            Clique no botão para iniciar sessão em {host}. A ligação só pode ser usada uma vez e expira em 24 horas.
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={url} style={{ background: brand, color: "#fff", borderRadius: 12, padding: "14px 22px", fontSize: 15, fontWeight: 600 }}>
              Iniciar sessão
            </Button>
          </Section>
          <Text style={{ color: "#625e57", fontSize: 13 }}>
            Se não pediu este email, pode ignorá-lo: ninguém acede à sua conta sem esta ligação.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;
