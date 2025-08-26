import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, MapPin, ShieldCheck, Smartphone } from 'lucide-react';

const features = [
  {
    icon: <Smartphone className="h-8 w-8 flex-shrink-0 text-primary" />,
    title: 'Easy Booking',
    description: 'Book your ride in seconds with our user-friendly mobile app.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 flex-shrink-0 text-primary" />,
    title: 'Safety First',
    description: 'We prioritize your safety with verified drivers and real-time tracking.',
  },
  {
    icon: <DollarSign className="h-8 w-8 flex-shrink-0 text-primary" />,
    title: 'Transparent Pricing',
    description: 'Know your fare upfront. No hidden charges, no surprises.',
  },
  {
    icon: <MapPin className="h-8 w-8 flex-shrink-0 text-primary" />,
    title: 'Wide Coverage',
    description: 'We are available in multiple cities, and expanding fast!',
  },
];

export function Features() {
  return (
    <section id="features" className="w-full bg-card py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Why Choose BlueRide?
          </h2>
          <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-xl">
            We offer a seamless, safe, and affordable transportation experience.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="transform shadow-lg transition-transform hover:-translate-y-2">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                {feature.icon}
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
