import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

const brand = "#1d3fb5";
const shell = { background: "#f5f4f1", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: "32px 0" } as const;
const card = { background: "#ffffff", borderRadius: 16, maxWidth: 520, padding: 32, border: "1px solid #dfdcd5" } as const;

export function NewsletterConfirmEmail({ url, locale }: { url: string; locale: "pt" | "en" }) {
  const pt = locale === "pt";
  return (
    <Html lang={pt ? "pt-PT" : "en"}>
      <Head />
      <Preview>{pt ? "Confirme a subscrição da newsletter" : "Confirm your newsletter subscription"}</Preview>
      <Body style={shell}>
        <Container style={card}>
          <Text style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Praça</Text>
          <Heading as="h1" style={{ fontSize: 22, margin: "24px 0 8px" }}>{pt ? "Confirme o seu email" : "Confirm your email"}</Heading>
          <Text style={{ color: "#625e57", fontSize: 15, lineHeight: "22px" }}>
            {pt ? "Pediu para receber a newsletter da Praça com análises do mercado. Só começamos a enviar depois de confirmar." : "You asked to receive the Praça newsletter with market analysis. We only start sending once you confirm."}
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={url} style={{ background: brand, color: "#fff", borderRadius: 12, padding: "14px 22px", fontSize: 15, fontWeight: 600 }}>{pt ? "Confirmar subscrição" : "Confirm subscription"}</Button>
          </Section>
          <Text style={{ color: "#625e57", fontSize: 13 }}>{pt ? "Se não foi você, ignore este email e não receberá nada." : "If this wasn't you, ignore this email and you will receive nothing."}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export interface DigestArticle {
  title: string;
  excerpt: string | null;
  url: string;
}

export function NewsletterDigestEmail({ articles, unsubscribeUrl, locale }: { articles: DigestArticle[]; unsubscribeUrl: string; locale: "pt" | "en" }) {
  const pt = locale === "pt";
  return (
    <Html lang={pt ? "pt-PT" : "en"}>
      <Head />
      <Preview>{articles[0]?.title ?? "Praça"}</Preview>
      <Body style={shell}>
        <Container style={card}>
          <Text style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Praça</Text>
          <Heading as="h1" style={{ fontSize: 20, margin: "20px 0 4px" }}>{pt ? "Novos artigos" : "New articles"}</Heading>
          {articles.map((a) => (
            <Section key={a.url} style={{ margin: "18px 0" }}>
              <Link href={a.url} style={{ color: brand, fontSize: 17, fontWeight: 600, textDecoration: "none" }}>{a.title}</Link>
              {a.excerpt && <Text style={{ color: "#625e57", fontSize: 14, margin: "4px 0 0" }}>{a.excerpt}</Text>}
            </Section>
          ))}
          <Hr style={{ borderColor: "#dfdcd5", margin: "24px 0 12px" }} />
          <Text style={{ color: "#625e57", fontSize: 12 }}>
            {pt ? "Recebe este email porque subscreveu a newsletter da Praça. " : "You receive this email because you subscribed to the Praça newsletter. "}
            <Link href={unsubscribeUrl} style={{ color: "#625e57" }}>{pt ? "Cancelar subscrição" : "Unsubscribe"}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
