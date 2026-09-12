"use client";

import { useWorkspace } from "@/shared/compat/workspace-provider";
import { Avatar, EmptyState, PageHeading } from "@/shared/components/ui";

export function Team() {
  const { data } = useWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="THE HANDS BEHIND EVERY STITCH"
        title="Your lovely little team."
        description="The people who turn a piece of fabric into something special."
      />
      <div className="team-grid">
        {data.staff.map((person) => (
          <article className="panel team-card" key={person.id}>
            <Avatar name={person.name} tone={person.color} />
            <h2>{person.name}</h2>
            <p>{person.role}</p>
            <span className="team-station">{person.station}</span>
          </article>
        ))}
      </div>
      {!data.staff.length && (
        <EmptyState
          title="Your team starts here"
          text="Your owner profile will appear after setup."
        />
      )}
    </>
  );
}
