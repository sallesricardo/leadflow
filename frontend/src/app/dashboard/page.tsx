import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="text-sm text-muted-foreground">
          Visão geral dos seus leads e oportunidades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total de leads
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              0
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Novos
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              0
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Em negociação
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              0
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Ganhos
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              0
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              Pipeline será implementado aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
