import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Save, MessageSquare, TestTube, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const RuleEditor = () => {
  const [currentRule, setCurrentRule] = useState(`index=security sourcetype=cloudtrail
| search eventName="AssumeRole*"
| eval time_diff=now()-_time
| where time_diff<300
| stats count by sourceIPAddress, userIdentity.type
| where count>5`);

  const [testResults, setTestResults] = useState({
    matches: 12,
    falsePositives: 2,
    performance: "0.8s",
    lastRun: "2 minutes ago"
  });

  const handleRunTest = () => {
    toast.info("Running simulation...", {
      description: "Testing rule against historical data"
    });
    
    // Simulate test delay
    setTimeout(() => {
      setTestResults({
        matches: Math.floor(Math.random() * 20) + 5,
        falsePositives: Math.floor(Math.random() * 5),
        performance: `${(Math.random() * 2 + 0.5).toFixed(1)}s`,
        lastRun: "Just now"
      });
      toast.success("Simulation complete!", {
        description: "Check results in the Test Results tab"
      });
    }, 2000);
  };

  const handleSaveRule = () => {
    toast.success("Rule saved successfully!", {
      description: "Changes have been saved to draft"
    });
  };

  const aiSuggestions = [
    "Consider adding geo-location filtering to reduce false positives",
    "Adjust time window from 5 minutes to 10 minutes for better accuracy",
    "Add user behavior baseline comparison",
    "Include service account exclusions for automated processes"
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border-border">
          <TabsTrigger value="editor">Rule Editor</TabsTrigger>
          <TabsTrigger value="test">Test Results</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <Card className="bg-muted/20 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">CloudTrail IAM Role Assumption</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    Active
                  </Badge>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    Draft Changes
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Query Logic</label>
                <Textarea
                  value={currentRule}
                  onChange={(e) => setCurrentRule(e.target.value)}
                  placeholder="Enter your detection rule..."
                  className="min-h-[200px] font-mono text-sm bg-background border-border"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleRunTest}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleSaveRule}
                  className="bg-card border-border hover:bg-muted/20"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{testResults.matches}</div>
                <div className="text-sm text-muted-foreground">Matches Found</div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">{testResults.falsePositives}</div>
                <div className="text-sm text-muted-foreground">False Positives</div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">{testResults.performance}</div>
                <div className="text-sm text-muted-foreground">Query Time</div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <div className="text-sm font-medium text-foreground">{testResults.lastRun}</div>
                <div className="text-sm text-muted-foreground">Last Test</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/20 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Simulation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
                  <span className="text-sm">Rule syntax validation</span>
                  <Badge className="bg-success text-success-foreground">Passed</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <span className="text-sm">Performance impact</span>
                  <Badge className="bg-warning text-warning-foreground">Medium</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
                  <span className="text-sm">Historical accuracy</span>
                  <Badge className="bg-success text-success-foreground">87%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="bg-muted/20 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{suggestion}</p>
                    </div>
                    <Button size="sm" variant="outline" className="bg-card border-border hover:bg-muted/20">
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Textarea 
                    placeholder="Ask the AI assistant about your rule..."
                    className="flex-1 min-h-[80px] bg-background border-border"
                  />
                  <Button className="bg-primary hover:bg-primary/90">
                    Ask AI
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};