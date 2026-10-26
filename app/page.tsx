import { read } from "@/lib/db";
import App from "@/components/app";
export const dynamic = "force-dynamic";
export default function Page() {
  return <App initial={read()} />;
}
