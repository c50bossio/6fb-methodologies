'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { Progress } from '@/components/ui/Progress';
import {
  Package,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Users,
  Star,
  Target,
  Copy,
  Save,
  Eye,
  EyeOff,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';

interface BaseService {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  basePrice: number;
  category: 'haircut' | 'styling' | 'coloring' | 'treatment' | 'grooming' | 'specialty';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  materials: string[];
  popularity: number; // 1-5 stars
}

interface ServicePackageItem {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  duration: number;
  discount: number; // percentage
  required: boolean;
  position: number;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'premium' | 'luxury' | 'specialty' | 'seasonal';
  targetMarket: 'budget' | 'mid-range' | 'premium' | 'luxury';
  services: ServicePackageItem[];
  totalDuration: number;
  totalBasePrice: number;
  packagePrice: number;
  totalDiscount: number;
  marginPercent: number;
  isActive: boolean;
  seasonalStart?: string;
  seasonalEnd?: string;
  maxBookingsPerDay?: number;
  advanceBookingDays?: number;
  tags: string[];
}

interface PackageAnalytics {
  profitPerPackage: number;
  profitMargin: number;
  timeEfficiency: number; // revenue per minute
  competitiveAnalysis: {
    category: string;
    averageMarketPrice: number;
    pricePosition: 'below' | 'competitive' | 'premium';
    recommendedPricing: number;
  };
  demandForecast: {
    expectedBookingsPerWeek: number;
    seasonalMultiplier: number;
  };
}

interface ServicePackageDesignerProps {
  onComplete?: (packages: ServicePackage[]) => void;
  onSave?: (packages: ServicePackage[]) => void;
  initialPackages?: ServicePackage[];
  availableServices?: BaseService[];
  readonly?: boolean;
  showAnalytics?: boolean;
}

const defaultServices: BaseService[] = [
  {
    id: '1',
    name: 'Classic Haircut',
    description: 'Traditional scissor cut with styling',
    duration: 45,
    basePrice: 45,
    category: 'haircut',
    difficulty: 'beginner',
    materials: ['Scissors', 'Comb', 'Styling product'],
    popularity: 5
  },
  {
    id: '2',
    name: 'Beard Trim',
    description: 'Professional beard shaping and trimming',
    duration: 20,
    basePrice: 25,
    category: 'grooming',
    difficulty: 'intermediate',
    materials: ['Trimmer', 'Scissors', 'Beard oil'],
    popularity: 4
  },
  {
    id: '3',
    name: 'Hot Towel Shave',
    description: 'Traditional straight razor shave with hot towel',
    duration: 30,
    basePrice: 40,
    category: 'grooming',
    difficulty: 'advanced',
    materials: ['Straight razor', 'Hot towel', 'Shaving cream'],
    popularity: 3
  },
  {
    id: '4',
    name: 'Hair Wash & Style',
    description: 'Shampoo, conditioning, and professional styling',
    duration: 25,
    basePrice: 30,
    category: 'styling',
    difficulty: 'beginner',
    materials: ['Shampoo', 'Conditioner', 'Styling products'],
    popularity: 4
  },
  {
    id: '5',
    name: 'Color Touch-up',
    description: 'Root touch-up and color refreshing',
    duration: 60,
    basePrice: 75,
    category: 'coloring',
    difficulty: 'advanced',
    materials: ['Hair color', 'Developer', 'Foils'],
    popularity: 3
  },
  {
    id: '6',
    name: 'Scalp Treatment',
    description: 'Deep cleansing and moisturizing scalp treatment',
    duration: 40,
    basePrice: 55,
    category: 'treatment',
    difficulty: 'intermediate',
    materials: ['Treatment products', 'Scalp massager'],
    popularity: 2
  }
];

const categoryColors = {
  basic: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  luxury: 'bg-gold-100 text-gold-800',
  specialty: 'bg-green-100 text-green-800',
  seasonal: 'bg-orange-100 text-orange-800',
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-orange-100 text-orange-700',
  expert: 'bg-red-100 text-red-700',
};

export default function ServicePackageDesigner({
  onComplete,
  onSave,
  initialPackages = [],
  availableServices = defaultServices,
  readonly = false,
  showAnalytics = true,
}: ServicePackageDesignerProps) {
  const [packages, setPackages] = useState<ServicePackage[]>(initialPackages);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentPackage = packages.find(pkg => pkg.id === selectedPackage);

  const analytics = useMemo((): PackageAnalytics | null => {
    if (!currentPackage || !showAnalytics) return null;

    const profitPerPackage = currentPackage.packagePrice - currentPackage.totalBasePrice;
    const profitMargin = (profitPerPackage / currentPackage.packagePrice) * 100;
    const timeEfficiency = currentPackage.packagePrice / currentPackage.totalDuration;

    // Mock competitive analysis - in real app would come from market data
    const marketPrices = {
      basic: 60,
      premium: 120,
      luxury: 200,
      specialty: 150,
      seasonal: 100,
    };

    const averageMarketPrice = marketPrices[currentPackage.category];
    const pricePosition =
      currentPackage.packagePrice < averageMarketPrice * 0.8 ? 'below' :
      currentPackage.packagePrice > averageMarketPrice * 1.2 ? 'premium' : 'competitive';

    const recommendedPricing = Math.round(averageMarketPrice * 0.95);

    // Mock demand forecast
    const baseBookings = {
      basic: 15,
      premium: 8,
      luxury: 4,
      specialty: 6,
      seasonal: 10,
    };

    const seasonalMultiplier = currentPackage.seasonalStart ? 1.5 : 1.0;

    return {
      profitPerPackage,
      profitMargin,
      timeEfficiency,
      competitiveAnalysis: {
        category: currentPackage.category,
        averageMarketPrice,
        pricePosition,
        recommendedPricing,
      },
      demandForecast: {
        expectedBookingsPerWeek: baseBookings[currentPackage.category],
        seasonalMultiplier,
      },
    };
  }, [currentPackage, showAnalytics]);

  const createNewPackage = (): ServicePackage => ({
    id: Date.now().toString(),
    name: 'New Package',
    description: '',
    category: 'basic',
    targetMarket: 'mid-range',
    services: [],
    totalDuration: 0,
    totalBasePrice: 0,
    packagePrice: 0,
    totalDiscount: 0,
    marginPercent: 20,
    isActive: true,
    tags: [],
  });

  const addPackage = () => {
    if (readonly) return;

    const newPackage = createNewPackage();
    setPackages(prev => [...prev, newPackage]);
    setSelectedPackage(newPackage.id);
  };

  const updatePackage = (packageId: string, updates: Partial<ServicePackage>) => {
    if (readonly) return;

    setPackages(prev => prev.map(pkg =>
      pkg.id === packageId ? { ...pkg, ...updates } : pkg
    ));
  };

  const deletePackage = (packageId: string) => {
    if (readonly) return;

    setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
    if (selectedPackage === packageId) {
      setSelectedPackage(null);
    }
  };

  const addServiceToPackage = (packageId: string, serviceId: string) => {
    if (readonly) return;

    const service = availableServices.find(s => s.id === serviceId);
    if (!service) return;

    const packageToUpdate = packages.find(pkg => pkg.id === packageId);
    if (!packageToUpdate) return;

    const newService: ServicePackageItem = {
      serviceId: service.id,
      serviceName: service.name,
      basePrice: service.basePrice,
      duration: service.duration,
      discount: 0,
      required: true,
      position: packageToUpdate.services.length,
    };

    updatePackage(packageId, {
      services: [...packageToUpdate.services, newService]
    });

    recalculatePackage(packageId);
  };

  const updateServiceInPackage = (packageId: string, serviceId: string, updates: Partial<ServicePackageItem>) => {
    if (readonly) return;

    const packageToUpdate = packages.find(pkg => pkg.id === packageId);
    if (!packageToUpdate) return;

    const updatedServices = packageToUpdate.services.map(service =>
      service.serviceId === serviceId ? { ...service, ...updates } : service
    );

    updatePackage(packageId, { services: updatedServices });
    recalculatePackage(packageId);
  };

  const removeServiceFromPackage = (packageId: string, serviceId: string) => {
    if (readonly) return;

    const packageToUpdate = packages.find(pkg => pkg.id === packageId);
    if (!packageToUpdate) return;

    const updatedServices = packageToUpdate.services.filter(service => service.serviceId !== serviceId);

    updatePackage(packageId, { services: updatedServices });
    recalculatePackage(packageId);
  };

  const recalculatePackage = (packageId: string) => {
    const packageToUpdate = packages.find(pkg => pkg.id === packageId);
    if (!packageToUpdate) return;

    const totalDuration = packageToUpdate.services.reduce((sum, service) => sum + service.duration, 0);
    const totalBasePrice = packageToUpdate.services.reduce((sum, service) => sum + service.basePrice, 0);
    const totalDiscountAmount = packageToUpdate.services.reduce((sum, service) =>
      sum + (service.basePrice * service.discount / 100), 0
    );

    const discountedPrice = totalBasePrice - totalDiscountAmount;
    const marginAmount = discountedPrice * (packageToUpdate.marginPercent / 100);
    const packagePrice = discountedPrice + marginAmount;

    const totalDiscount = (totalDiscountAmount / totalBasePrice) * 100;

    updatePackage(packageId, {
      totalDuration,
      totalBasePrice,
      packagePrice: Math.round(packagePrice),
      totalDiscount,
    });
  };

  const duplicatePackage = (packageId: string) => {
    if (readonly) return;

    const packageToDuplicate = packages.find(pkg => pkg.id === packageId);
    if (!packageToDuplicate) return;

    const duplicatedPackage: ServicePackage = {
      ...packageToDuplicate,
      id: Date.now().toString(),
      name: `${packageToDuplicate.name} (Copy)`,
    };

    setPackages(prev => [...prev, duplicatedPackage]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const handleSave = () => {
    if (onSave) {
      onSave(packages);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(packages);
    }
  };

  const filteredPackages = showInactive ? packages : packages.filter(pkg => pkg.isActive);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Service Package Designer
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Create and manage service packages to increase revenue and efficiency
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                  disabled={readonly}
                />
                <Label className="text-sm">Show inactive</Label>
              </div>
              {!readonly && (
                <Button onClick={addPackage} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Package
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Package List */}
            <div className="space-y-4">
              <h3 className="font-semibold">Packages ({filteredPackages.length})</h3>
              <div className="space-y-2">
                {filteredPackages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all ${
                      selectedPackage === pkg.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{pkg.name}</h4>
                            {!pkg.isActive && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <Badge className={categoryColors[pkg.category]} variant="secondary">
                            {pkg.category}
                          </Badge>
                        </div>
                        {!readonly && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicatePackage(pkg.id);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePackage(pkg.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium">{formatCurrency(pkg.packagePrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{formatDuration(pkg.totalDuration)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Services:</span>
                          <span>{pkg.services.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredPackages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {packages.length === 0 ? 'No packages created yet' : 'No active packages'}
                  </div>
                )}
              </div>
            </div>

            {/* Package Editor */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPackage && currentPackage ? (
                <>
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Package Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="package-name">Package Name</Label>
                          <Input
                            id="package-name"
                            value={currentPackage.name}
                            onChange={(e) => updatePackage(currentPackage.id, { name: e.target.value })}
                            disabled={readonly}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={currentPackage.category}
                            onValueChange={(value: any) => updatePackage(currentPackage.id, { category: value })}
                            disabled={readonly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="luxury">Luxury</SelectItem>
                              <SelectItem value="specialty">Specialty</SelectItem>
                              <SelectItem value="seasonal">Seasonal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="target-market">Target Market</Label>
                          <Select
                            value={currentPackage.targetMarket}
                            onValueChange={(value: any) => updatePackage(currentPackage.id, { targetMarket: value })}
                            disabled={readonly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="mid-range">Mid-Range</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="luxury">Luxury</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="margin">Profit Margin (%)</Label>
                          <Input
                            id="margin"
                            type="number"
                            value={currentPackage.marginPercent}
                            onChange={(e) => {
                              updatePackage(currentPackage.id, { marginPercent: Number(e.target.value) });
                              recalculatePackage(currentPackage.id);
                            }}
                            min="0"
                            max="100"
                            disabled={readonly}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={currentPackage.description}
                          onChange={(e) => updatePackage(currentPackage.id, { description: e.target.value })}
                          rows={3}
                          disabled={readonly}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={currentPackage.isActive}
                          onCheckedChange={(checked) => updatePackage(currentPackage.id, { isActive: checked })}
                          disabled={readonly}
                        />
                        <Label>Active package</Label>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Services */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Services ({currentPackage.services.length})</span>
                        {!readonly && (
                          <Select onValueChange={(serviceId) => addServiceToPackage(currentPackage.id, serviceId)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Add service" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableServices
                                .filter(service => !currentPackage.services.some(s => s.serviceId === service.id))
                                .map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name} - {formatCurrency(service.basePrice)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentPackage.services.map((service, index) => {
                        const baseService = availableServices.find(s => s.id === service.serviceId);
                        return (
                          <Card key={service.serviceId}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">{service.serviceName}</h4>
                                  {baseService && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge className={difficultyColors[baseService.difficulty]} variant="secondary">
                                        {baseService.difficulty}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {baseService.category}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {!readonly && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeServiceFromPackage(currentPackage.id, service.serviceId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <Label className="text-xs">Base Price</Label>
                                  <div className="text-sm font-medium">{formatCurrency(service.basePrice)}</div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Duration</Label>
                                  <div className="text-sm">{formatDuration(service.duration)}</div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Discount (%)</Label>
                                  <Input
                                    type="number"
                                    value={service.discount}
                                    onChange={(e) => updateServiceInPackage(currentPackage.id, service.serviceId, { discount: Number(e.target.value) })}
                                    min="0"
                                    max="50"
                                    className="h-8"
                                    disabled={readonly}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Final Price</Label>
                                  <div className="text-sm font-medium">
                                    {formatCurrency(service.basePrice * (1 - service.discount / 100))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={service.required}
                                    onCheckedChange={(checked) => updateServiceInPackage(currentPackage.id, service.serviceId, { required: checked })}
                                    disabled={readonly}
                                  />
                                  <Label className="text-sm">Required</Label>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {currentPackage.services.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No services added yet. Use the dropdown above to add services.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Package Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Package Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Total Duration
                          </div>
                          <div className="text-2xl font-bold">{formatDuration(currentPackage.totalDuration)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            Base Price
                          </div>
                          <div className="text-2xl font-bold">{formatCurrency(currentPackage.totalBasePrice)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            Package Price
                          </div>
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(currentPackage.packagePrice)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            Total Savings
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(currentPackage.totalBasePrice - currentPackage.packagePrice)}
                          </div>
                        </div>
                      </div>

                      {currentPackage.totalDiscount > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <Star className="h-4 w-4" />
                            Customer saves {currentPackage.totalDiscount.toFixed(1)}% with this package
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Analytics */}
                  {showAnalytics && analytics && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Package Analytics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Profit per Package</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(analytics.profitPerPackage)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {analytics.profitMargin.toFixed(1)}% margin
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Time Efficiency</div>
                            <div className="text-2xl font-bold">
                              {formatCurrency(analytics.timeEfficiency)}/min
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Expected Bookings/Week</div>
                            <div className="text-2xl font-bold">
                              {Math.round(analytics.demandForecast.expectedBookingsPerWeek * analytics.demandForecast.seasonalMultiplier)}
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h4 className="font-semibold">Competitive Analysis</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Market Average:</span>
                                <span className="font-medium">{formatCurrency(analytics.competitiveAnalysis.averageMarketPrice)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Your Price:</span>
                                <span className="font-medium">{formatCurrency(currentPackage.packagePrice)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Position:</span>
                                <Badge
                                  variant={analytics.competitiveAnalysis.pricePosition === 'competitive' ? 'default' : 'secondary'}
                                  className={
                                    analytics.competitiveAnalysis.pricePosition === 'below' ? 'bg-red-100 text-red-700' :
                                    analytics.competitiveAnalysis.pricePosition === 'premium' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                  }
                                >
                                  {analytics.competitiveAnalysis.pricePosition}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Recommended Pricing</div>
                              <div className="text-lg font-semibold">{formatCurrency(analytics.competitiveAnalysis.recommendedPricing)}</div>
                              {currentPackage.packagePrice !== analytics.competitiveAnalysis.recommendedPricing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updatePackage(currentPackage.id, { packagePrice: analytics.competitiveAnalysis.recommendedPricing })}
                                  disabled={readonly}
                                >
                                  Apply Recommendation
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center space-y-4">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold">No Package Selected</h3>
                        <p className="text-muted-foreground">
                          Select a package from the list or create a new one to get started.
                        </p>
                      </div>
                      {!readonly && packages.length === 0 && (
                        <Button onClick={addPackage} className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create Your First Package
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {packages.length > 0 && (
                <div className="flex justify-between items-center pt-6">
                  {!readonly && (
                    <Button onClick={handleSave} variant="outline" className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Packages
                    </Button>
                  )}

                  <Button onClick={handleComplete} className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Complete Designer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}