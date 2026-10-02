import Header from "@/components/Header";
import Tutorial from "@/components/Tutorial";

export const metadata = { title: "Mama Put's Class" };

export default function TutorialPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title="Mama Put's Class" />
      <Tutorial />
    </main>
  );
}
