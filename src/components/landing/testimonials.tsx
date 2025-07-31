import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
  {
    quote: "BlueRide has completely changed my commute. It's fast, reliable, and the drivers are so professional. I can't imagine going back to my old routine.",
    name: "Sarah L.",
    title: "Daily Commuter",
    avatar: "SL",
  },
  {
    quote: "As a frequent traveler, I rely on BlueRide for airport transfers. They are always on time, and the pricing is very reasonable. Highly recommended!",
    name: "Michael B.",
    title: "Business Traveler",
    avatar: "MB",
  },
  {
    quote: "I love the safety features BlueRide offers. As a parent, knowing I can track my daughter's ride gives me peace of mind. The app is also super easy to use.",
    name: "Jessica P.",
    title: "Parent",
    avatar: "JP",
  },
   {
    quote: "The best part about BlueRide is the transparent pricing. No more surge pricing shocks! What you see is what you pay. It's a game-changer.",
    name: "David C.",
    title: "Student",
    avatar: "DC",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="w-full bg-card py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            What Our Riders Say
          </h2>
          <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-xl">
            Real stories from our satisfied customers.
          </p>
        </div>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-4xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  <Card className="flex flex-col justify-between h-full shadow-md">
                    <CardContent className="p-6">
                      <p className="mb-4 text-muted-foreground">"{testimonial.quote}"</p>
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10">
                           <AvatarImage src={`https://placehold.co/40x40.png?text=${testimonial.avatar}`} />
                           <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
