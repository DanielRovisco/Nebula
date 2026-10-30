import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";

export interface DigestItem {
  title: string;
  place: string;
  price: string;
  change: string;
  url: string;
  image?: string | null;
}

export interface AlertDigestProps {
  searchName: string;
  items: DigestItem[];
  more: number;
  searchUrl: string;
  unsubscribeUrl: string;
  locale: "pt" | "en";
}

const T = {
  pt: { intro: (n: number) => `${n} ${n === 1 ? "novidade" : "novidades"} na sua pesquisa`, open: "Ver imóvel", all: "Ver todos os resultados", more: (n: number) => `e mais ${n}`, foot: "Recebe este email porque guardou esta pesquisa na Praça.", unsub: "Cancelar este alerta" },
  en: { intro: (n: number) => `${n} ${n === 1 ? "update" : "updates"} on your search`, open: "View property", all: "See all results", more: (n: number) => `and ${n} more`, foot: "You receive this email because you saved this search on Praça.", unsub: "Cancel this alert" },
} as const;

const brand = "#1d3fb5";

export function AlertDigestEmail({ searchName, items, more, searchUrl, unsubscribeUrl, locale }: AlertDigestProps) {
  const t = T[locale];
  return (
    <Html lang={locale === "pt" ? "pt-PT" : "en"}>
      <Head />
      <Preview>{`${t.intro(items.length + more)}: ${searchName}`}</Preview>
      <Body style={{ background: "#f5f4f1", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: "28px 0" }}>
        <Container style={{ maxWidth: 560, background: "#ffffff", borderRadius: 16, border: "1px solid #dfdcd5", padding: 28 }}>
          <Text style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1917" }}>Praça</Text>
          <Heading as="h1" style={{ fontSize: 20, margin: "18px 0 4px", color: "#1a1917" }}>
            {t.intro(items.length + more)}
          </Heading>
          <Text style={{ color: "#625e57", fontSize: 14, margin: "0 0 18px" }}>{searchName}</Text>
          {items.map((i) => (
            <Section key={i.url} style={{ borderTop: "1px solid #dfdcd5", padding: "14px 0" }}>
              <Row>
                {i.image && (
                  <Column style={{ width: 120, verticalAlign: "top" }}>
                    <Img src={i.image} width="108" height="72" alt="" style={{ borderRadius: 10, objectFit: "cover" }} />
                  </Column>
                )}
                <Column style={{ verticalAlign: "top" }}>
                  <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1917" }}>{i.price}</Text>
                  <Text style={{ margin: "2px 0", fontSize: 14, color: "#1a1917" }}>{i.title}</Text>
                  <Text style={{ margin: 0, fontSize: 12, color: "#625e57" }}>{i.place}</Text>
                  <Text style={{ margin: "4px 0", fontSize: 12, fontWeight: 600, color: "#146c43" }}>{i.change}</Text>
                  <Link href={i.url} style={{ fontSize: 13, color: brand, fontWeight: 600 }}>
                    {t.open}
                  </Link>
                </Column>
              </Row>
            </Section>
          ))}
          {more > 0 && <Text style={{ color: "#625e57", fontSize: 13 }}>{t.more(more)}</Text>}
          <Section style={{ margin: "18px 0" }}>
            <Button href={searchUrl} style={{ background: brand, color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600 }}>
              {t.all}
            </Button>
          </Section>
          <Hr style={{ borderColor: "#dfdcd5" }} />
          <Text style={{ color: "#625e57", fontSize: 12 }}>
            {t.foot}{" "}
            <Link href={unsubscribeUrl} style={{ color: "#625e57" }}>
              {t.unsub}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AlertDigestEmail;
