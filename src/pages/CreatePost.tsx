import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Copy,
  Calendar,
  Edit,
  Loader2,
  CheckCircle,
  Clock,
  Sparkles,
  Send,
  Save,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ContentService } from "@/lib/contentService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- helpers ---------------- */

const formatUrl = (url: string) => {
  let formatted = url.trim().replace(/\s+/g, "");
  if (formatted && !formatted.match(/^https?:\/\//i)) {
    formatted = `https://${formatted}`;
  }
  return formatted;
};

const callEdgeFunction = async (payload: any) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be logged in to use AI features");
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-post`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error || `Server error ${response.status}`);
  }

  return await response.json();
};

/* ---------------- schema ---------------- */

const formSchema = z
  .object({
    category: z.string().min(1, "Please select a post category"),
    topic: z.string().min(1, "Please enter a topic"),
    topicType: z.enum(["text", "url", "askai"]),
    tone: z.string().min(1, "Please select a post tone"),
  })
  .refine(
    (data) => {
      if (data.topicType === "url") {
        try {
          new URL(formatUrl(data.topic));
          return true;
        } catch {
          return false;
        }
      }
      return true;
    },
    { message: "Please enter a valid URL", path: ["topic"] }
  );

type FormData = z.infer<typeof formSchema>;

const categories = [
  "Storytelling/Thought Leadership/Authority",
  "Lead Magnets & YT Video-based content",
  "Case studies/Testimonials/Results",
  "Skool Community/Educational",
];

const tones = [
  "Authoritative",
  "Descriptive",
  "Casual",
  "Narrative",
  "Humorous",
];

/* ---------------- component ---------------- */

export default function CreatePost() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [generatedPost, setGeneratedPost] = useState("");
  const [editedPost, setEditedPost] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const [changeRequest, setChangeRequest] = useState("");

  const [askAiInput, setAskAiInput] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("12:00");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      topic: "",
      topicType: "text",
      tone: "",
    },
  });

  /* ---------------- actions ---------------- */

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);
    try {
      const topic =
        data.topicType === "url" ? formatUrl(data.topic) : data.topic;

      const res = await callEdgeFunction({
        prompt: topic,
        topic,
        tone: data.tone,
        category: data.category,
        type: "generate",
      });

      setGeneratedPost(res.content || "");
      setEditedPost(res.content || "");

      toast({ title: "Post generated successfully" });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResubmit = async () => {
    if (!changeRequest.trim()) return;
    setIsResubmitting(true);
    try {
      const prompt = `Original:\n${editMode ? editedPost : generatedPost}\n\nChange request:\n${changeRequest}`;

      const res = await callEdgeFunction({
        prompt,
        topic: prompt,
        tone: form.getValues("tone"),
        category: form.getValues("category"),
        type: "generate",
      });

      setGeneratedPost(res.content || "");
      setEditedPost(res.content || "");
      setChangeRequest("");
      toast({ title: "Post refined" });
    } catch (e: any) {
      toast({
        title: "Refinement failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleAskAI = async () => {
    if (!askAiInput.trim()) return;
    const category = form.getValues("category");
    if (!category) {
      toast({
        title: "Select category first",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAiSuggestions(true);
    try {
      const res = await callEdgeFunction({
        prompt: askAiInput,
        category,
        type: "askai",
      });

      const clean = res.content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(clean);
      setAiSuggestions(parsed.ideas || []);
      setShowSuggestionDropdown(true);
    } catch (e: any) {
      toast({
        title: "Ask AI failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  /* ---------------- UI helpers ---------------- */

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(
      editMode ? editedPost : generatedPost
    );
    toast({ title: "Copied to clipboard" });
  };

  const topicType = form.watch("topicType");

  useEffect(() => {
    setGeneratedPost("");
    setEditedPost("");
    setEditMode(false);
    setChangeRequest("");
    setAskAiInput("");
    setAiSuggestions([]);
    setShowSuggestionDropdown(false);
  }, [topicType]);

  /* ---------------- render ---------------- */

  return (
    <div className="min-h-screen p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create LinkedIn Post</CardTitle>
          <CardDescription>
            Secure AI-powered content via Supabase Edge Functions
          </CardDescription>
        </CardHeader>

        <CardContent className="grid lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 lg:col-span-1"
            >
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topicType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Method</FormLabel>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-3"
                    >
                      <ToggleGroupItem value="text">Text</ToggleGroupItem>
                      <ToggleGroupItem value="askai">Ask AI</ToggleGroupItem>
                      <ToggleGroupItem value="url">URL</ToggleGroupItem>
                    </ToggleGroup>
                  </FormItem>
                )}
              />

              {topicType === "askai" && (
                <>
                  <Label>AI Query</Label>
                  <Textarea
                    value={askAiInput}
                    onChange={(e) => setAskAiInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleAskAI}
                    disabled={isLoadingAiSuggestions}
                    variant="outline"
                  >
                    {isLoadingAiSuggestions ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                    Ask AI
                  </Button>

                  {showSuggestionDropdown &&
                    aiSuggestions.map((s, i) => (
                      <div
                        key={i}
                        className="border p-2 rounded cursor-pointer"
                        onClick={() => {
                          form.setValue("topic", s.topic);
                          form.setValue("tone", s.tone);
                          setShowSuggestionDropdown(false);
                        }}
                      >
                        <strong>{s.title}</strong>
                      </div>
                    ))}
                </>
              )}

              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tones.map((t) => (
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
                {isGenerating ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Sparkles className="mr-2" />
                )}
                Generate
              </Button>
            </form>
          </Form>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex justify-between flex-row">
                <CardTitle>Generated Content</CardTitle>
                {generatedPost && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyToClipboard}>
                      <Copy />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditMode(!editMode)}
                    >
                      <Edit />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <Textarea
                    className="min-h-[300px]"
                    value={editedPost}
                    onChange={(e) => setEditedPost(e.target.value)}
                  />
                ) : (
                  <div className="whitespace-pre-wrap min-h-[300px]">
                    {generatedPost || "Content will appear here..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {generatedPost && (
              <Card>
                <CardHeader>
                  <CardTitle>Refine Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={changeRequest}
                    onChange={(e) => setChangeRequest(e.target.value)}
                    placeholder="Describe changes..."
                  />
                  <Button
                    onClick={handleResubmit}
                    disabled={isResubmitting}
                    className="mt-2"
                  >
                    {isResubmitting ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Sparkles className="mr-2" />
                    )}
                    Refine
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
