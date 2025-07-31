import Image from 'next/image';

const steps = [
    {
        number: "01",
        title: "Request a Ride",
        description: "Open the app and enter your destination. Confirm your pickup location and choose your ride."
    },
    {
        number: "02",
        title: "Get Matched",
        description: "A nearby driver sees and accepts your ride request. You'll see your driver's details and can track their arrival on the map."
    },
    {
        number: "03",
        title: "Enjoy Your Trip",
        description: "Sit back and relax. We'll take care of the navigation and get you to your destination safely."
    }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">How It Works</div>
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Getting a ride is simple</h2>
          <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Follow these three easy steps to book your next ride with BlueRide.
          </p>
          <div className="mt-6 space-y-6">
            {steps.map((step) => (
                <div key={step.number} className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <span className="text-xl font-bold">{step.number}</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
                    </div>
                </div>
            ))}
          </div>
        </div>
        <Image
          alt="App Screenshot"
          className="mx-auto aspect-square overflow-hidden rounded-xl object-cover object-center shadow-lg sm:w-full"
          data-ai-hint="app screen mobile"
          height="550"
          src="https://placehold.co/550x550.png"
          width="550"
        />
      </div>
    </section>
  );
}
