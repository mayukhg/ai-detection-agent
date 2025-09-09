import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, TrendingUp, Activity, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  alertId: string;
  ruleName: string;
  timestamp: string;
  analyst: string;
  status: 'pending' | 'true-positive' | 'false-positive';
  confidence: number;
}

export const FeedbackConsole = () => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([
    {
      id: '1',
      alertId: 'ALT-2024-001234',
      ruleName: 'Suspicious PowerShell Activity',
      timestamp: '2024-01-15 14:32:15',
      analyst: 'Sarah Chen',
      status: 'pending',
      confidence: 85
    },
    {
      id: '2',
      alertId: 'ALT-2024-001235',
      ruleName: 'Impossible Travel Detection',
      timestamp: '2024-01-15 14:28:42',
      analyst: 'Mike Rodriguez',
      status: 'false-positive',
      confidence: 92
    },
    {
      id: '3',
      alertId: 'ALT-2024-001236',
      ruleName: 'CloudTrail IAM Changes',
      timestamp: '2024-01-15 14:25:18',
      analyst: 'Alex Kim',
      status: 'true-positive',
      confidence: 78
    },
  ]);

  const dataHealthMetrics = {
    totalFeedback: 1547,
    recentFalsePositives: 27,
    accuracyTrend: 94.2,
    autoTuneActions: 12,
    lastTuning: '2 hours ago'
  };

  const handleMarkTP = (item: FeedbackItem) => {
    setFeedbackItems(prev => 
      prev.map(i => i.id === item.id ? { ...i, status: 'true-positive' as const } : i)
    );
    toast.success("Marked as True Positive", {
      description: "This feedback will improve future detections"
    });
  };

  const handleMarkFP = (item: FeedbackItem) => {
    setFeedbackItems(prev => 
      prev.map(i => i.id === item.id ? { ...i, status: 'false-positive' as const } : i)
    );
    toast.warning("Marked as False Positive", {
      description: "Rule will be automatically tuned to reduce similar alerts"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'true-positive':
        return <Badge className="bg-success/10 text-success border-success/30">True Positive</Badge>;
      case 'false-positive':
        return <Badge className="bg-warning/10 text-warning border-warning/30">False Positive</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-muted/20 text-muted-foreground">Pending Review</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="feedback" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border-border">
          <TabsTrigger value="feedback">Recent Feedback</TabsTrigger>
          <TabsTrigger value="health">Data Health</TabsTrigger>
          <TabsTrigger value="tuning">Auto-Tuning</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">{dataHealthMetrics.totalFeedback}</div>
                <div className="text-sm text-muted-foreground">Total Feedback</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">{dataHealthMetrics.recentFalsePositives}</div>
                <div className="text-sm text-muted-foreground">Recent FPs</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{dataHealthMetrics.accuracyTrend}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">{dataHealthMetrics.autoTuneActions}</div>
                <div className="text-sm text-muted-foreground">Auto-Tunes</div>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Items */}
          <div className="space-y-3">
            {feedbackItems.map((item) => (
              <Card key={item.id} className="bg-muted/20 border-border hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-foreground">{item.ruleName}</h4>
                        {getStatusBadge(item.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>Alert: {item.alertId}</div>
                        <div>Analyst: {item.analyst}</div>
                        <div>Time: {item.timestamp}</div>
                        <div>Confidence: {item.confidence}%</div>
                      </div>
                    </div>
                    
                    {item.status === 'pending' && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkTP(item)}
                          className="bg-success/10 text-success border border-success/30 hover:bg-success/20"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          TP
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMarkFP(item)}
                          className="bg-warning/10 text-warning border-warning/30 hover:bg-warning/20"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          FP
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-muted/20 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Detection Accuracy Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Accuracy</span>
                    <span className="text-lg font-bold text-success">94.2%</span>
                  </div>
                  <Progress value={94.2} className="h-3" />
                  
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="font-medium text-foreground">92.1%</div>
                      <div className="text-muted-foreground">Last Week</div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">89.8%</div>
                      <div className="text-muted-foreground">Last Month</div>
                    </div>
                    <div>
                      <div className="font-medium text-success">+4.4%</div>
                      <div className="text-muted-foreground">Improvement</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Data Health Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-success/10 border border-success/30 rounded">
                    <span className="text-sm">Data Ingestion</span>
                    <Badge className="bg-success text-success-foreground">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-success/10 border border-success/30 rounded">
                    <span className="text-sm">Rule Coverage</span>
                    <Badge className="bg-success text-success-foreground">82%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-warning/10 border border-warning/30 rounded">
                    <span className="text-sm">Alert Fatigue Risk</span>
                    <Badge className="bg-warning text-warning-foreground">Medium</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tuning" className="space-y-4">
          <Card className="bg-muted/20 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-Tuning Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div>
                    <div className="font-medium text-foreground">Impossible Travel Threshold</div>
                    <div className="text-sm text-muted-foreground">Adjusted from 2h to 3h based on FP analysis</div>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Applied</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <div>
                    <div className="font-medium text-foreground">DNS Noise Filter</div>
                    <div className="text-sm text-muted-foreground">Pending approval for domain whitelist update</div>
                  </div>
                  <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                  <div>
                    <div className="font-medium text-foreground">PowerShell Execution Context</div>
                    <div className="text-sm text-muted-foreground">Added service account exclusions</div>
                  </div>
                  <Badge className="bg-success text-success-foreground">Completed</Badge>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground mb-2">Last auto-tuning run: {dataHealthMetrics.lastTuning}</div>
                <Button variant="outline" className="w-full bg-card border-border hover:bg-muted/20">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Schedule Next Auto-Tune
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};