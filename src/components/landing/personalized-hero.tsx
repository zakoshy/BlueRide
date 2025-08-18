
"use client";

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const carouselImages = [
  "/boat1.jpg",
  "/boat2.jpg",
  "/boat3.jpg",
  "/boat4.jpg",
  "/boat5.jpg",
];

export function PersonalizedHero() {
  const greeting = "Welcome to BlueRide";
  const highlight = "Your reliable water ride, just a tap away. Safe, affordable, and always on time.";

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:items-center">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
                <>
                  <h1 className="font-headline text-4xl font-extrabold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    {greeting}
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    {highlight}
                  </p>
                </>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
               <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:scale-105">
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
          
          <Carousel className="w-full max-w-lg mx-auto" opts={{ loop: true }}>
              <CarouselContent>
                {carouselImages.map((src, index) => (
                  <CarouselItem key={index}>
                    <Card className="overflow-hidden shadow-2xl">
                      <CardContent className="p-0">
                        <Image
                          src={src}
                          alt={`BlueRide boat image ${index + 1}`}
                          width={550}
                          height={550}
                          className="aspect-square w-full object-cover"
                          priority={index === 0}
                        />
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
          </Carousel>

        </div>
      </div>
    </section>
  );
}
