import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CoverageData {
  category: string;
  coverage: number;
  gaps: number;
  status: 'high' | 'medium' | 'low';
}

export const CoverageMatrix = () => {
  const coverageData: CoverageData[] = [
    { category: "MITRE ATT&CK", coverage: 82, gaps: 15, status: 'high' },
    { category: "Cloud Security", coverage: 76, gaps: 8, status: 'high' },
    { category: "Fraud Detection", coverage: 65, gaps: 12, status: 'medium' },
    { category: "APM Anomalies", coverage: 58, gaps: 18, status: 'medium' },
    { category: "Endpoint Detection", coverage: 91, gaps: 3, status: 'high' },
    { category: "Network Monitoring", coverage: 45, gaps: 22, status: 'low' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high': return 'coverage-high';
      case 'medium': return 'coverage-medium';
      case 'low': return 'coverage-low';
      default: return 'coverage-medium';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {coverageData.map((item, index) => (
          <Card key={index} className="bg-muted/30 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-foreground">{item.category}</h4>
                  <Badge 
                    variant="outline" 
                    className={
                      item.status === 'high' ? 'bg-coverage-high/10 text-coverage-high border-coverage-high/30' :
                      item.status === 'medium' ? 'bg-coverage-medium/10 text-coverage-medium border-coverage-medium/30' :
                      'bg-coverage-low/10 text-coverage-low border-coverage-low/30'
                    }
                  >
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{item.coverage}%</div>
                  <div className="text-xs text-muted-foreground">{item.gaps} gaps</div>
                </div>
              </div>
              <Progress 
                value={item.coverage} 
                className="h-2"
              />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-coverage-high rounded-full"></div>
              <span className="text-muted-foreground">High (&gt;80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-coverage-medium rounded-full"></div>
              <span className="text-muted-foreground">Medium (50-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-coverage-low rounded-full"></div>
              <span className="text-muted-foreground">Low (&lt;50%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};