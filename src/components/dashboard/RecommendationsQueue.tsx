import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, CheckCircle, XCircle, Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Recommendation {
  id: string;
  type: 'new-rule' | 'tune-rule' | 'suppress';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  aiConfidence: number;
  estimatedImpact: string;
}

export const RecommendationsQueue = () => {
  const recommendations: Recommendation[] = [
    {
      id: '1',
      type: 'new-rule',
      title: 'New Rule: CloudTrail IAM Role Misuse',
      description: 'Detected pattern of unusual IAM role assumptions from new geographic locations',
      priority: 'high',
      aiConfidence: 92,
      estimatedImpact: 'Reduce IAM attack vector by 34%'
    },
    {
      id: '2',
      type: 'tune-rule',
      title: 'Tune Rule: Impossible Travel Detection',
      description: 'Adjust thresholds to reduce false positives while maintaining detection accuracy',
      priority: 'medium',
      aiConfidence: 87,
      estimatedImpact: 'Decrease FP by 18%'
    },
    {
      id: '3',
      type: 'suppress',
      title: 'Suppress: DNS Noise Alerts',
      description: 'Recurring benign DNS queries generating noise in SOC workflow',
      priority: 'low',
      aiConfidence: 95,
      estimatedImpact: 'Reduce alert volume by 8%'
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new-rule': return <Brain className="h-4 w-4" />;
      case 'tune-rule': return <Settings className="h-4 w-4" />;
      case 'suppress': return <AlertTriangle className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      'new-rule': { label: 'New Rule', color: 'bg-primary/10 text-primary border-primary/30' },
      'tune-rule': { label: 'Tune Rule', color: 'bg-warning/10 text-warning border-warning/30' },
      'suppress': { label: 'Suppress', color: 'bg-muted text-muted-foreground border-border' },
    };
    return config[type as keyof typeof config] || config['new-rule'];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-alert-critical';
      case 'medium': return 'text-warning';
      case 'low': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const handleApprove = (recommendation: Recommendation) => {
    toast.success(`Approved: ${recommendation.title}`, {
      description: "Recommendation will be implemented in the next deployment cycle."
    });
  };

  const handleReject = (recommendation: Recommendation) => {
    toast.error(`Rejected: ${recommendation.title}`, {
      description: "Recommendation has been marked as not suitable."
    });
  };

  return (
    <div className="space-y-4">
      {recommendations.map((rec) => {
        const typeBadge = getTypeBadge(rec.type);
        return (
          <Card key={rec.id} className="bg-muted/20 border-border/50 hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getTypeIcon(rec.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">{rec.title}</h4>
                      <Badge variant="outline" className={typeBadge.color}>
                        {typeBadge.label}
                      </Badge>
                      <Badge variant="outline" className={`${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">AI Confidence:</span>
                        <span className="font-medium text-primary">{rec.aiConfidence}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Impact:</span>
                        <span className="font-medium text-success">{rec.estimatedImpact}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-success/10 text-success border-success/30 hover:bg-success/20"
                    onClick={() => handleApprove(rec)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                    onClick={() => handleReject(rec)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      <div className="text-center pt-4">
        <Button variant="outline" className="bg-card border-border hover:bg-muted/20">
          <Brain className="h-4 w-4 mr-2" />
          Generate More Recommendations
        </Button>
      </div>
    </div>
  );
};