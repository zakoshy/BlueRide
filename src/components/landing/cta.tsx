import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Cta() {
  return (
    <section id="cta" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container flex flex-col items-center gap-4 px-4 text-center md:px-6">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Ready to Ride?
        </h2>
        <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
          Download the BlueRide app today and experience the future of transportation. Your next ride is just a tap away.
        </p>
        <div className="mt-6">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:scale-105">
            <Link href="/signup">Sign Up Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
