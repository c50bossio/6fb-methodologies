'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { AlertCircle, TrendingUp, DollarSign, Calculator, Target, Save, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';

interface ServicePackage {
  id: string;
  name: string;
  basePrice: number;
  timeMinutes: number;
  materials: number;
  overhead: number;
  margin: number;
  description?: string;
  category: 'haircut' | 'styling' | 'coloring' | 'treatment' | 'package';
}

interface PricingData {
  businessInfo: {
    name: string;
    location: string;
    experience: 'beginner' | 'intermediate' | 'advanced' | 'master';
    targetMarket: 'budget' | 'mid-range' | 'premium' | 'luxury';
  };
  operatingCosts: {
    rent: number;
    utilities: number;
    supplies: number;
    insurance: number;
    marketing: number;
    other: number;
  };
  timeConstraints: {
    hoursPerDay: number;
    daysPerWeek: number;
    vacationWeeks: number;
    appointmentBuffer: number;
  };
  services: ServicePackage[];
  goals: {
    monthlyRevenue: number;
    averageTicket: number;
    clientsPerDay: number;
  };
}

interface CalculationResults {
  totalMonthlyCosts: number;
  totalAnnualCosts: number;
  workingDaysPerYear: number;
  availableHoursPerYear: number;
  requiredHourlyRate: number;
  projectedMonthlyRevenue: number;
  projectedAnnualRevenue: number;
  profitMargin: number;
  servicesNeededPerDay: number;
  averageServicePrice: number;
  recommendations: string[];
}

interface RevenuePricingCalculatorProps {
  onComplete?: (data: PricingData, results: CalculationResults) => void;
  onSave?: (data: PricingData) => void;
  initialData?: Partial<PricingData>;
  readonly?: boolean;
  showExport?: boolean;
}

const defaultServicePackages: ServicePackage[] = [
  {
    id: '1',
    name: 'Basic Haircut',
    basePrice: 45,
    timeMinutes: 45,
    materials: 3,
    overhead: 8,
    margin: 0.6,
    category: 'haircut',
    description: 'Standard cut and style'
  },
  {
    id: '2',
    name: 'Premium Cut & Style',
    basePrice: 75,
    timeMinutes: 60,
    materials: 5,
    overhead: 12,
    margin: 0.65,
    category: 'styling',
    description: 'Cut, wash, and detailed styling'
  },
  {
    id: '3',
    name: 'Color Treatment',
    basePrice: 120,
    timeMinutes: 120,
    materials: 25,
    overhead: 20,
    margin: 0.7,
    category: 'coloring',
    description: 'Full color service with treatment'
  }
];

export default function RevenuePricingCalculator({
  onComplete,
  onSave,
  initialData,
  readonly = false,
  showExport = true,
}: RevenuePricingCalculatorProps) {
  const [activeTab, setActiveTab] = useState('business-info');
  const [data, setData] = useState<PricingData>({
    businessInfo: {
      name: '',
      location: '',
      experience: 'intermediate',
      targetMarket: 'mid-range',
    },
    operatingCosts: {
      rent: 0,
      utilities: 0,
      supplies: 0,
      insurance: 0,
      marketing: 0,
      other: 0,
    },
    timeConstraints: {
      hoursPerDay: 8,
      daysPerWeek: 5,
      vacationWeeks: 2,
      appointmentBuffer: 15,
    },
    services: defaultServicePackages,
    goals: {
      monthlyRevenue: 8000,
      averageTicket: 65,
      clientsPerDay: 8,
    },
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);

  const calculations = useMemo((): CalculationResults => {
    const totalMonthlyCosts = Object.values(data.operatingCosts).reduce((sum, cost) => sum + cost, 0);
    const totalAnnualCosts = totalMonthlyCosts * 12;

    const workingDaysPerYear = (52 - data.timeConstraints.vacationWeeks) * data.timeConstraints.daysPerWeek;
    const availableHoursPerYear = workingDaysPerYear * data.timeConstraints.hoursPerDay;

    const requiredHourlyRate = totalAnnualCosts / availableHoursPerYear;

    const averageServiceTime = data.services.length > 0
      ? data.services.reduce((sum, service) => sum + service.timeMinutes, 0) / data.services.length
      : 60;

    const averageServicePrice = data.services.length > 0
      ? data.services.reduce((sum, service) => sum + service.basePrice, 0) / data.services.length
      : 0;

    const servicesPerHour = 60 / (averageServiceTime + data.timeConstraints.appointmentBuffer);
    const servicesNeededPerDay = data.goals.clientsPerDay;

    const projectedDailyRevenue = servicesNeededPerDay * averageServicePrice;
    const projectedMonthlyRevenue = projectedDailyRevenue * (workingDaysPerYear / 12);
    const projectedAnnualRevenue = projectedDailyRevenue * workingDaysPerYear;

    const profitMargin = ((projectedAnnualRevenue - totalAnnualCosts) / projectedAnnualRevenue) * 100;

    const recommendations: string[] = [];

    if (profitMargin < 20) {
      recommendations.push('Consider increasing prices or reducing costs - profit margin is below 20%');
    }
    if (averageServicePrice < requiredHourlyRate * (averageServiceTime / 60)) {
      recommendations.push('Service prices may be too low to cover operating costs');
    }
    if (servicesNeededPerDay > servicesPerHour * data.timeConstraints.hoursPerDay) {
      recommendations.push('Goal requires more appointments than time allows - consider extending hours or raising prices');
    }
    if (data.goals.averageTicket > averageServicePrice * 1.5) {
      recommendations.push('Consider adding premium services or upselling to reach average ticket goal');
    }
    if (profitMargin > 50) {
      recommendations.push('Excellent profit margins - consider reinvesting in marketing or facility improvements');
    }

    return {
      totalMonthlyCosts,
      totalAnnualCosts,
      workingDaysPerYear,
      availableHoursPerYear,
      requiredHourlyRate,
      projectedMonthlyRevenue,
      projectedAnnualRevenue,
      profitMargin,
      servicesNeededPerDay,
      averageServicePrice,
      recommendations,
    };
  }, [data]);

  const updateData = (section: keyof PricingData, updates: any) => {
    if (readonly) return;

    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  const updateService = (serviceId: string, updates: Partial<ServicePackage>) => {
    if (readonly) return;

    setData(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.id === serviceId ? { ...service, ...updates } : service
      )
    }));
  };

  const addService = () => {
    if (readonly) return;

    const newService: ServicePackage = {
      id: Date.now().toString(),
      name: 'New Service',
      basePrice: 50,
      timeMinutes: 60,
      materials: 5,
      overhead: 10,
      margin: 0.6,
      category: 'haircut',
    };

    setData(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const removeService = (serviceId: string) => {
    if (readonly) return;

    setData(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== serviceId)
    }));
  };

  const validateSection = (section: string): boolean => {
    const newErrors: Record<string, string> = {};

    switch (section) {
      case 'business-info':
        if (!data.businessInfo.name.trim()) newErrors.businessName = 'Business name is required';
        if (!data.businessInfo.location.trim()) newErrors.location = 'Location is required';
        break;
      case 'costs':
        if (calculations.totalMonthlyCosts <= 0) newErrors.costs = 'Operating costs must be greater than zero';
        break;
      case 'time':
        if (data.timeConstraints.hoursPerDay <= 0) newErrors.hours = 'Hours per day must be greater than zero';
        if (data.timeConstraints.daysPerWeek <= 0) newErrors.days = 'Days per week must be greater than zero';
        break;
      case 'services':
        if (data.services.length === 0) newErrors.services = 'At least one service is required';
        break;
      case 'goals':
        if (data.goals.monthlyRevenue <= 0) newErrors.revenue = 'Monthly revenue goal must be greater than zero';
        break;
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (onSave) {
      onSave(data);
    }
  };

  const handleComplete = () => {
    const allSectionsValid = [
      'business-info', 'costs', 'time', 'services', 'goals'
    ].every(validateSection);

    if (allSectionsValid) {
      setIsComplete(true);
      if (onComplete) {
        onComplete(data, calculations);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    let total = 5;

    if (data.businessInfo.name && data.businessInfo.location) completed++;
    if (calculations.totalMonthlyCosts > 0) completed++;
    if (data.timeConstraints.hoursPerDay > 0 && data.timeConstraints.daysPerWeek > 0) completed++;
    if (data.services.length > 0) completed++;
    if (data.goals.monthlyRevenue > 0) completed++;

    return (completed / total) * 100;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Revenue & Pricing Calculator
          </CardTitle>
          <div className="space-y-2">
            <Progress value={getCompletionPercentage()} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Complete all sections to get your personalized pricing strategy
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="business-info">Business Info</TabsTrigger>
              <TabsTrigger value="costs">Operating Costs</TabsTrigger>
              <TabsTrigger value="time">Time Constraints</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="business-info" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={data.businessInfo.name}
                    onChange={(e) => updateData('businessInfo', { name: e.target.value })}
                    placeholder="Your barbershop name"
                    disabled={readonly}
                  />
                  {errors.businessName && (
                    <p className="text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={data.businessInfo.location}
                    onChange={(e) => updateData('businessInfo', { location: e.target.value })}
                    placeholder="City, State"
                    disabled={readonly}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select
                    value={data.businessInfo.experience}
                    onValueChange={(value: any) => updateData('businessInfo', { experience: value })}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                      <SelectItem value="advanced">Advanced (5-10 years)</SelectItem>
                      <SelectItem value="master">Master (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-market">Target Market</Label>
                  <Select
                    value={data.businessInfo.targetMarket}
                    onValueChange={(value: any) => updateData('businessInfo', { targetMarket: value })}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget ($20-40)</SelectItem>
                      <SelectItem value="mid-range">Mid-Range ($40-80)</SelectItem>
                      <SelectItem value="premium">Premium ($80-150)</SelectItem>
                      <SelectItem value="luxury">Luxury ($150+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="costs" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(data.operatingCosts).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)} (Monthly)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={key}
                        type="number"
                        value={value}
                        onChange={(e) => updateData('operatingCosts', { [key]: Number(e.target.value) })}
                        placeholder="0"
                        className="pl-10"
                        disabled={readonly}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Monthly Costs:</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(calculations.totalMonthlyCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Annual Costs:</span>
                    <span className="text-lg">
                      {formatCurrency(calculations.totalAnnualCosts)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {errors.costs && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.costs}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="time" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="hours-per-day">Hours Per Day</Label>
                  <Input
                    id="hours-per-day"
                    type="number"
                    value={data.timeConstraints.hoursPerDay}
                    onChange={(e) => updateData('timeConstraints', { hoursPerDay: Number(e.target.value) })}
                    min="1"
                    max="16"
                    disabled={readonly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days-per-week">Days Per Week</Label>
                  <Input
                    id="days-per-week"
                    type="number"
                    value={data.timeConstraints.daysPerWeek}
                    onChange={(e) => updateData('timeConstraints', { daysPerWeek: Number(e.target.value) })}
                    min="1"
                    max="7"
                    disabled={readonly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacation-weeks">Vacation Weeks Per Year</Label>
                  <Input
                    id="vacation-weeks"
                    type="number"
                    value={data.timeConstraints.vacationWeeks}
                    onChange={(e) => updateData('timeConstraints', { vacationWeeks: Number(e.target.value) })}
                    min="0"
                    max="52"
                    disabled={readonly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment-buffer">Buffer Between Appointments (minutes)</Label>
                  <Input
                    id="appointment-buffer"
                    type="number"
                    value={data.timeConstraints.appointmentBuffer}
                    onChange={(e) => updateData('timeConstraints', { appointmentBuffer: Number(e.target.value) })}
                    min="0"
                    max="60"
                    disabled={readonly}
                  />
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Working Days/Year</p>
                      <p className="text-xl font-semibold">{calculations.workingDaysPerYear}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available Hours/Year</p>
                      <p className="text-xl font-semibold">{calculations.availableHoursPerYear.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Service Menu</h3>
                {!readonly && (
                  <Button onClick={addService} variant="outline">
                    Add Service
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {data.services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Service Name</Label>
                          <Input
                            value={service.name}
                            onChange={(e) => updateService(service.id, { name: e.target.value })}
                            disabled={readonly}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Base Price</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={service.basePrice}
                              onChange={(e) => updateService(service.id, { basePrice: Number(e.target.value) })}
                              className="pl-10"
                              disabled={readonly}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Time (minutes)</Label>
                          <Input
                            type="number"
                            value={service.timeMinutes}
                            onChange={(e) => updateService(service.id, { timeMinutes: Number(e.target.value) })}
                            disabled={readonly}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={service.category}
                            onValueChange={(value: any) => updateService(service.id, { category: value })}
                            disabled={readonly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="haircut">Haircut</SelectItem>
                              <SelectItem value="styling">Styling</SelectItem>
                              <SelectItem value="coloring">Coloring</SelectItem>
                              <SelectItem value="treatment">Treatment</SelectItem>
                              <SelectItem value="package">Package</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Materials Cost</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={service.materials}
                              onChange={(e) => updateService(service.id, { materials: Number(e.target.value) })}
                              className="pl-10"
                              disabled={readonly}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Overhead Cost</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={service.overhead}
                              onChange={(e) => updateService(service.id, { overhead: Number(e.target.value) })}
                              className="pl-10"
                              disabled={readonly}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Profit Margin</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={(service.margin * 100).toFixed(0)}
                              onChange={(e) => updateService(service.id, { margin: Number(e.target.value) / 100 })}
                              min="0"
                              max="100"
                              disabled={readonly}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>

                      {service.description && (
                        <div className="mt-4">
                          <Label>Description</Label>
                          <Textarea
                            value={service.description}
                            onChange={(e) => updateService(service.id, { description: e.target.value })}
                            disabled={readonly}
                            rows={2}
                          />
                        </div>
                      )}

                      {!readonly && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={() => removeService(service.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {data.services.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Add at least one service to continue with calculations.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="goals" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="monthly-revenue">Monthly Revenue Goal</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monthly-revenue"
                      type="number"
                      value={data.goals.monthlyRevenue}
                      onChange={(e) => updateData('goals', { monthlyRevenue: Number(e.target.value) })}
                      placeholder="8000"
                      className="pl-10"
                      disabled={readonly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="average-ticket">Average Ticket Goal</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="average-ticket"
                      type="number"
                      value={data.goals.averageTicket}
                      onChange={(e) => updateData('goals', { averageTicket: Number(e.target.value) })}
                      placeholder="65"
                      className="pl-10"
                      disabled={readonly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clients-per-day">Clients Per Day Goal</Label>
                  <Input
                    id="clients-per-day"
                    type="number"
                    value={data.goals.clientsPerDay}
                    onChange={(e) => updateData('goals', { clientsPerDay: Number(e.target.value) })}
                    placeholder="8"
                    disabled={readonly}
                  />
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Goal Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Revenue Needed</p>
                      <p className="text-xl font-semibold">{formatCurrency(data.goals.monthlyRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Annual Revenue Needed</p>
                      <p className="text-xl font-semibold">{formatCurrency(data.goals.monthlyRevenue * 12)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Revenue Needed</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(data.goals.monthlyRevenue / (calculations.workingDaysPerYear / 12))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Services Per Month</p>
                      <p className="text-xl font-semibold">
                        {Math.round(data.goals.monthlyRevenue / data.goals.averageTicket)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Required Hourly Rate</p>
                        <p className="text-2xl font-bold">{formatCurrency(calculations.requiredHourlyRate)}</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Monthly Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(calculations.projectedMonthlyRevenue)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Profit Margin</p>
                        <p className="text-2xl font-bold">{calculations.profitMargin.toFixed(1)}%</p>
                      </div>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        calculations.profitMargin >= 30 ? 'bg-green-100 text-green-600' :
                        calculations.profitMargin >= 20 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Service Price</p>
                        <p className="text-2xl font-bold">{formatCurrency(calculations.averageServicePrice)}</p>
                      </div>
                      <Calculator className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Financial Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Annual Costs:</span>
                          <span className="font-medium">{formatCurrency(calculations.totalAnnualCosts)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Projected Annual Revenue:</span>
                          <span className="font-medium">{formatCurrency(calculations.projectedAnnualRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Annual Profit:</span>
                          <span className="font-medium">
                            {formatCurrency(calculations.projectedAnnualRevenue - calculations.totalAnnualCosts)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Operational Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Working Days/Year:</span>
                          <span className="font-medium">{calculations.workingDaysPerYear}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available Hours/Year:</span>
                          <span className="font-medium">{calculations.availableHoursPerYear.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Services Needed/Day:</span>
                          <span className="font-medium">{calculations.servicesNeededPerDay}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {calculations.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {calculations.recommendations.map((recommendation, index) => (
                        <Alert key={index}>
                          <AlertDescription>{recommendation}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between items-center pt-6">
                {!readonly && (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} variant="outline" className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Progress
                    </Button>
                    {showExport && (
                      <Button variant="outline" className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export Results
                      </Button>
                    )}
                  </div>
                )}

                {!isComplete && (
                  <Button onClick={handleComplete} className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Complete Calculator
                  </Button>
                )}

                {isComplete && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Calculator Complete
                  </Badge>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}