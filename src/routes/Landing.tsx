import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-widest">bibo</span>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>bibo — foundation ready</CardTitle>
            <CardDescription>
              Nền tảng React + Vite + TypeScript + Tailwind + shadcn đã sẵn sàng. Chọn tool đầu
              tiên để bắt đầu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button>Bắt đầu</Button>
            <Button variant="outline">Tài liệu</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
