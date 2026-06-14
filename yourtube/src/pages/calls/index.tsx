import React from "react";
import FriendsList from "@/components/FriendsList";

const CallsPage = () => {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto">
        <FriendsList />
      </div>
    </main>
  );
};

export default CallsPage;
