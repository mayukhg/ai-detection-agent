import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export const AlertsTrend = () => {
  const trendData = [
    { time: '00:00', total: 45, falsePositives: 8, truePositives: 37 },
    { time: '04:00', total: 62, falsePositives: 12, truePositives: 50 },
    { time: '08:00', total: 89, falsePositives: 15, truePositives: 74 },
    { time: '12:00', total: 124, falsePositives: 18, truePositives: 106 },
    { time: '16:00', total: 156, falsePositives: 22, truePositives: 134 },
    { time: '20:00', total: 98, falsePositives: 14, truePositives: 84 },
  ];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">1,240</div>
          <div className="text-sm text-muted-foreground">Total Alerts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-warning">12%</div>
          <div className="text-sm text-muted-foreground">FP Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">3h</div>
          <div className="text-sm text-muted-foreground">Mean Time Between FP</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              name="Total Alerts"
            />
            <Line 
              type="monotone" 
              dataKey="falsePositives" 
              stroke="hsl(var(--warning))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--warning))', strokeWidth: 2, r: 3 }}
              name="False Positives"
            />
            <Line 
              type="monotone" 
              dataKey="truePositives" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 3 }}
              name="True Positives"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};