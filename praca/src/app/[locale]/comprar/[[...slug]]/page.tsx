import { SearchRoute, searchMetadata } from "../../_search-route";

export const dynamic = "force-dynamic";
export const generateMetadata = (props: Parameters<typeof searchMetadata>[1]) => searchMetadata("sale", props);
export default function Page(props: Parameters<typeof SearchRoute>[1]) {
  return SearchRoute("sale", props);
}
