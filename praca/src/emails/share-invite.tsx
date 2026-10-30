import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

export function ShareInviteEmail({ from, title, split, url }: { from: string; title: string; split: number; url: string }) {
  return (
    <Html lang="pt-PT">
      <Head />
      <Preview>{`${from} quer partilhar um imóvel consigo`}</Preview>
      <Body style={{ background: "#f5f4f1", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ background: "#ffffff", borderRadius: 16, maxWidth: 480, padding: 32, border: "1px solid #dfdcd5" }}>
          <Text style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1917" }}>Praça</Text>
          <Heading as="h1" style={{ fontSize: 20, margin: "24px 0 8px", color: "#1a1917" }}>Partilha de comissão</Heading>
          <Text style={{ color: "#625e57", fontSize: 15, lineHeight: "22px" }}>{from} propõe trabalhar «{title}» em parceria, com {split}% da comissão para si.</Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={url} style={{ background: "#1d3fb5", color: "#fff", borderRadius: 12, padding: "14px 22px", fontSize: 15, fontWeight: 600 }}>Ver proposta</Button>
          </Section>
          <Text style={{ color: "#625e57", fontSize: 13 }}>Inicie sessão com este email e aceite ou recuse na área de partilhas do CRM.</Text>
        </Container>
      </Body>
    </Html>
  );
}
