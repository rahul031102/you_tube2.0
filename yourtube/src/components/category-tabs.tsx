"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

export default function CategoryTabs() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
     {/* // <div className="flex gap-2 mb-6 overflow-x-auto pb-2"> */}
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? "default" : "secondary"}
          className="whitespace-nowrap text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
          // className="whitespace-nowrap"
          onClick={() => setActiveCategory(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
