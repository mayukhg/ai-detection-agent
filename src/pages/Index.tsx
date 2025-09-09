import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoverageMatrix } from "@/components/dashboard/CoverageMatrix";
import { AlertsTrend } from "@/components/dashboard/AlertsTrend";
import { RecommendationsQueue } from "@/components/dashboard/RecommendationsQueue";
import { RuleEditor } from "@/components/dashboard/RuleEditor";
import { FeedbackConsole } from "@/components/dashboard/FeedbackConsole";
import { Shield, Brain, TrendingUp, Users } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-cyber">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Detection Engineering Console</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Security Operations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
                Active Monitoring
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                AI Agent Online
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-card border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Overview
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Rules
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Coverage</p>
                      <p className="text-2xl font-bold text-success">82%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Alerts</p>
                      <p className="text-2xl font-bold text-primary">1,240</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">False Positive Rate</p>
                      <p className="text-2xl font-bold text-warning">12%</p>
                    </div>
                    <Brain className="h-8 w-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Rules</p>
                      <p className="text-2xl font-bold text-accent">347</p>
                    </div>
                    <Users className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Coverage Matrix */}
              <Card className="bg-card border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Coverage Matrix</CardTitle>
                  <CardDescription>MITRE ATT&CK, Fraud, APM Coverage</CardDescription>
                </CardHeader>
                <CardContent>
                  <CoverageMatrix />
                </CardContent>
              </Card>

              {/* Alerts Trend */}
              <Card className="bg-card border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Alerts & Metrics Trend</CardTitle>
                  <CardDescription>Total, FP Rate, Trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertsTrend />
                </CardContent>
              </Card>
            </div>

            {/* Recommendations Queue */}
            <Card className="bg-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">AI Recommendations Queue</CardTitle>
                <CardDescription>Automated detection suggestions and optimizations</CardDescription>
              </CardHeader>
              <CardContent>
                <RecommendationsQueue />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card className="bg-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">Rule Editor & Simulation</CardTitle>
                <CardDescription>Edit queries, run tests, AI assistance</CardDescription>
              </CardHeader>
              <CardContent>
                <RuleEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card className="bg-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">Feedback Console</CardTitle>
                <CardDescription>Mark TP/FP, auto-tune actions, data health</CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackConsole />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;