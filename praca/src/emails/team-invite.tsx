import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

export function TeamInviteEmail({ orgName, inviter, url }: { orgName: string; inviter: string; url: string }) {
  return (
    <Html lang="pt-PT">
      <Head />
      <Preview>{`Convite para a equipa ${orgName}`}</Preview>
      <Body style={{ background: "#f5f4f1", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ background: "#ffffff", borderRadius: 16, maxWidth: 480, padding: 32, border: "1px solid #dfdcd5" }}>
          <Text style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1917" }}>Praça</Text>
          <Heading as="h1" style={{ fontSize: 22, margin: "24px 0 8px", color: "#1a1917" }}>Foi convidado para {orgName}</Heading>
          <Text style={{ color: "#625e57", fontSize: 15, lineHeight: "22px" }}>{inviter} convidou-o para a equipa na Praça. O convite expira em 7 dias.</Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={url} style={{ background: "#1d3fb5", color: "#fff", borderRadius: 12, padding: "14px 22px", fontSize: 15, fontWeight: 600 }}>Aceitar convite</Button>
          </Section>
          <Text style={{ color: "#625e57", fontSize: 13 }}>Inicie sessão com este endereço de email para aceitar. Se não esperava este convite, ignore-o.</Text>
        </Container>
      </Body>
    </Html>
  );
}
