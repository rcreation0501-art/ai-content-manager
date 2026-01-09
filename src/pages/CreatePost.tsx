import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Copy,
  Calendar,
  Edit,
  Loader2,
  Settings,
  CheckCircle,
  Clock,
  Sparkles,
  Send,
  Save,
  BookOpen,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ContentService } from "@/lib/contentService";
import { useAuth } from "@/contexts/AuthContext";

/* ------------------ utilities ------------------ */
const formatUrl = (url: string) => {
  let formatted = url.trim().replace(/\s+/g, "");
  if (formatted && !formatted.match(/^https?:\/\//i)) {
    formatted = `https://${formatted}`;
  }
  return formatted;
};

/* ------------------ schema ------------------ */
const formSchema = z
  .object({
    category: z.string().min(1),
    topic: z.string().min(1),
    topicType: z.enum(["text", "url", "askai"]),
    tone: z.string().min(1)
  });

type FormData = z.infer<typeof formSchema>;

const categories = [
  "Storytelling/Thought Leadership/Authority",
  "Lead Magnets & YT Video-based content",
  "Case studies/Testimonials/Results",
  "Skool Community/Educational"
];

const tones = [
  "Authoritative",
  "Descriptive",
  "Casual",
  "Narrative",
  "Humorous"
];

export default function CreatePost() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [generatedPost, setGeneratedPost] = useState("");
  const [editedPost, setEditedPost] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      topic: "",
      topicType: "text",
      tone: ""
    }
  });

  /* =========================================================
     🔑 ONLY CHANGE: direct fetch with headers (NO supabase.invoke)
     ========================================================= */
  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        "https://ddxhhotymwaemmcmxmhj.supabase.co/functions/v1/generate-post",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey
          },
          body: JSON.stringify({
            prompt: data.topic,
            topic: data.topic,
            tone: data.tone,
            category: data.category,
            type: "generate"
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      const text = result?.content || "";

      setGeneratedPost(text);
      setEditedPost(text);

      toast({
        title: "Post Generated",
        description: "Your LinkedIn post is ready"
      });
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create LinkedIn Post</CardTitle>
          <CardDescription>
            Generate professional content using Gemini AI
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tones.map(t => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Post"}
              </Button>
            </form>
          </Form>

          {generatedPost && (
            <div className="mt-6">
              <Textarea
                value={editedPost}
                onChange={e => setEditedPost(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
