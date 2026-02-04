import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GitBranch } from "lucide-react";

export default function GroupRoomCard({ room, counts, onSelect }) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => onSelect(room)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" /> {room.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {room.description && (<p className="text-sm text-gray-600">{room.description}</p>)}
        <div className="flex flex-wrap gap-2">
          {(room.domain_tags || []).slice(0,4).map((t,i) => (
            <Badge key={i} variant="outline">{t}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Users className="w-4 h-4" />
          <span>{(room.agent_ids||[]).length} agents</span>
          <span>•</span>
          <span>{(room.ai_ids||[]).length} AIs</span>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="outline">Ideas: {counts.ideas||0}</Badge>
          <Badge variant="outline">Research: {counts.research||0}</Badge>
          <Badge variant="outline">Build: {counts.build||0}</Badge>
          <Badge variant="outline">Deploy: {counts.deploy||0}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}