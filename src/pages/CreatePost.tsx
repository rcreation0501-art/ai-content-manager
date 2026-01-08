import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Calendar, Edit, Loader2, Settings, CheckCircle, Clock, Sparkles, Send, Save, BookOpen, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ContentService } from "@/lib/contentService";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with your Hard-Coded Key
const GEN_AI_KEY = "AIzaSyC6OaLVBxCG4UzNNrcxHeFbwrZcLzhcVcw"; 
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

// URL formatting utility function
const formatUrl = (url: string) => {
  let formatted = url.trim().replace(/\s+/g, '');
  if (formatted && !formatted.match(/^https?:\/\//i)) {
    formatted = `https://${formatted}`;
  }
  return formatted;
};

const formSchema = z.object({
  category: z.string().min(1, "Please select a post category"),
  topic: z.string().min(1, "Please enter a topic"),
  topicType: z.enum(["text", "url", "askai"]),
  tone: z.string().min(1, "Please select a post tone")
}).refine(data => {
  if (data.topicType === "url") {
    const formattedUrl = formatUrl(data.topic);
    try {
      new URL(formattedUrl);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "Please enter a valid URL",
  path: ["topic"]
});

type FormData = z.infer<typeof formSchema>;

const categories = ['Storytelling/Thought Leadership/Authority', 'Lead Magnets & YT Video-based content', 'Case studies/Testimonials/Results', 'Skool Community/Educational'];
const tones = ['Authoritative', 'Descriptive', 'Casual', 'Narrative', 'Humorous'];

export default function CreatePost() {
  const { profile } = useAuth();
  const [generatedPost, setGeneratedPost] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPost, setEditedPost] = useState("");

  // Ask AI feature state
  const [askAiInput, setAskAiInput] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<Array<{title: string, topic: string, tone: string}>>([]);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);

  // New dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [postPlatform, setPostPlatform] = useState("LinkedIn");
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedTime, setSelectedTime] = useState("12:00");

  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      topic: "",
      topicType: "text",
      tone: ""
    }
  });

  const isValidUrl = (string: string) => {
    const formatted = formatUrl(string);
    try {
      new URL(formatted);
      return true;
    } catch {
      return false;
    }
  };

  const validateUrlRealTime = (url: string) => {
    if (!url.trim()) return {
      isValid: true,
      message: ""
    };
    const formatted = formatUrl(url);
    try {
      new URL(formatted);
      return {
        isValid: true,
        message: ""
      };
    } catch {
      return {
        isValid: false,
        message: "Please enter a valid URL"
      };
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log("🚀 Generation started with Gemini");
    
    // Check if API key is defined
    if (!GEN_AI_KEY) {
      toast({
        title: "Configuration Error",
        description: "Gemini API Key is missing.",
        variant: "destructive"
      });
      return;
    }

    let processedTopic = data.topic;
    let finalTopicType = data.topicType;
    
    if (data.topicType === "url") {
      processedTopic = formatUrl(data.topic);
      if (!isValidUrl(data.topic)) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL",
          variant: "destructive"
        });
        return;
      }
    } else if (data.topicType === "askai") {
      finalTopicType = "text";
    }
    
    setIsGenerating(true);
    try {
      // CHANGED: Using "gemini-pro" instead of "gemini-1.5-flash"
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
      Act as a professional LinkedIn content creator.
      
      Task: Write a high-quality, engaging LinkedIn post.
      Category: ${data.category}
      Tone: ${data.tone}
      Topic/Context: ${processedTopic}
      ${data.topicType === 'url' ? '(Note: The topic provided is a URL. Please create a post based on the likely subject matter of this link/topic.)' : ''}

      Requirements:
      - Use appropriate spacing for readability.
      - Include a catchy hook in the first line.
      - Use relevant emojis.
      - End with a call to action.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setGeneratedPost(text || "Generated post content will appear here...");
      setEditedPost(text || "");
      toast({
        title: "Post Generated Successfully!",
        description: "Your LinkedIn post is ready to review"
      });
    } catch (error: any) {
      console.error("❌ Error generating post:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResubmit = async () => {
    console.log("🔄 Resubmit started");
    
    if (!changeRequest.trim()) {
      toast({
        title: "Change Request Required",
        description: "Please describe what changes you'd like to make",
        variant: "destructive"
      });
      return;
    }
    
    setIsResubmitting(true);
    try {
      // CHANGED: Using "gemini-pro" instead of "gemini-1.5-flash"
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
      I need you to rewrite the following LinkedIn post based on specific feedback.

      Original Post:
      "${editMode ? editedPost : generatedPost}"

      User Feedback/Change Request:
      "${changeRequest}"

      Please provide the rewritten post only. Maintain professional LinkedIn formatting.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setGeneratedPost(text || "Updated post content will appear here...");
      setEditedPost(text || "");
      setChangeRequest("");
      toast({
        title: "Post Updated Successfully!",
        description: "Your post has been refined based on your feedback"
      });
    } catch (error) {
      console.error("Error resubmitting:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editMode ? editedPost : generatedPost);
      toast({
        title: "Copied to clipboard!",
        description: "Post content is ready to paste on LinkedIn"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard",
        variant: "destructive"
      });
    }
  };

  // Auto-generate title from post content
  const generateTitle = (content: string): string => {
    if (!content) return "";
    
    // Take first sentence or first 60 characters, whichever is shorter
    const firstSentence = content.split(/[.!?]/)[0];
    const title = firstSentence.length > 60 ? content.substring(0, 60) + "..." : firstSentence;
    
    // Clean up and format
    return title.trim().replace(/\n/g, " ").replace(/\s+/g, " ");
  };

  // Add custom tag function
  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag("");
    }
  };

  // Remove tag function
  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Handle saving to library
  const handleSaveToLibrary = async () => {
    if (!postTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your post",
        variant: "destructive"
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Profile Error",
        description: "Unable to save post. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();
      const content = editMode ? editedPost : generatedPost;

      const sourceData = {
        category: formData.category,
        topic: formData.topic,
        topicType: formData.topicType,
        tone: formData.tone,
        originalContent: generatedPost
      };

      await ContentService.createPost({
        title: postTitle,
        content: content,
        content_type: 'create_post',
        status: 'draft',
        source_data: sourceData,
        original_content: generatedPost,
        platform: postPlatform,
        tags: selectedTags
      }, profile.tenant_id);

      toast({
        title: "Saved to Library!",
        description: "Your post has been saved and can be accessed from the Post Library"
      });
      
      setSaveDialogOpen(false);
      resetSaveForm();
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save post to library. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle scheduling post
  const handleSchedulePost = async () => {
    if (!postTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your post",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for scheduling",
        variant: "destructive"
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Profile Error",
        description: "Unable to schedule post. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsScheduling(true);
    try {
      const formData = form.getValues();
      const content = editMode ? editedPost : generatedPost;

      const sourceData = {
        category: formData.category,
        topic: formData.topic,
        topicType: formData.topicType,
        tone: formData.tone,
        originalContent: generatedPost
      };

      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      await ContentService.createPost({
        title: postTitle,
        content: content,
        content_type: 'create_post',
        status: 'scheduled',
        scheduled_date: scheduledDateTime.toISOString(),
        source_data: sourceData,
        original_content: generatedPost,
        platform: postPlatform,
        tags: selectedTags
      }, profile.tenant_id);

      toast({
        title: "Post Scheduled!",
        description: `Your post has been scheduled for ${format(scheduledDateTime, "PPP 'at' p")}`
      });
      
      setScheduleDialogOpen(false);
      resetSaveForm();
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast({
        title: "Schedule Failed",
        description: "Failed to schedule post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  // Reset save form
  const resetSaveForm = () => {
    setPostTitle("");
    setSelectedTags([]);
    setCustomTag("");
    setPostPlatform("LinkedIn");
    setSelectedDate(undefined);
    setSelectedTime("12:00");
  };

  // Auto-generate title when dialogs open
  const handleSaveDialogOpen = () => {
    if (!postTitle) {
      const content = editMode ? editedPost : generatedPost;
      setPostTitle(generateTitle(content));
    }
    setSaveDialogOpen(true);
  };

  const handleScheduleDialogOpen = () => {
    if (!postTitle) {
      const content = editMode ? editedPost : generatedPost;
      setPostTitle(generateTitle(content));
    }
    setScheduleDialogOpen(true);
  };

  const handleEditToggle = () => {
    if (editMode) {
      setGeneratedPost(editedPost);
      toast({
        title: "Changes Saved",
        description: "Your edits have been applied to the post"
      });
    } else {
      setEditedPost(generatedPost);
    }
    setEditMode(!editMode);
  };

  // Ask AI functionality
  const handleAskAI = async () => {
    console.log("🤖 Ask AI started with Gemini");
    
    if (!askAiInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter your AI query",
        variant: "destructive"
      });
      return;
    }

    const category = form.getValues("category");
    if (!category) {
      toast({
        title: "Category Required",
        description: "Please select a post category first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingAiSuggestions(true);
    try {
      // CHANGED: Using "gemini-pro" instead of "gemini-1.5-flash"
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      I need 3 LinkedIn post ideas for the category "${category}".
      User Context/Description: "${askAiInput}"

      Return strictly valid JSON with this exact structure (no markdown formatting):
      {
        "ideas": [
          {
            "title": "Short catchy title",
            "topic": "The detailed topic prompt to use for generation",
            "tone": "Suggested tone"
          }
        ]
      }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean up markdown code blocks if Gemini adds them
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const data = JSON.parse(text);
      const suggestions = data?.ideas || [];
      
      setAiSuggestions(suggestions);
      setShowSuggestionDropdown(true);
      
      toast({
        title: "AI Suggestions Ready!",
        description: "Select a suggestion to auto-fill your form"
      });
    } catch (error) {
      console.error("❌ Error getting AI suggestions:", error);
      toast({
        title: "AI Request Failed",
        description: "Failed to get AI suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: {title: string, topic: string, tone: string}) => {
    // Auto-fill the form fields but stay in "Ask AI" mode
    form.setValue("topic", suggestion.topic);
    form.setValue("tone", suggestion.tone);
    // Do NOT switch topicType back to "text" - stay in "askAI" mode
    
    toast({
      title: "Fields Auto-filled!",
      description: "Topic and tone have been set from AI suggestion"
    });
    setShowSuggestionDropdown(false);
  };

  const topicType = form.watch("topicType");

  // Clear fields when switching input methods
  useEffect(() => {
    if (topicType !== "askai") {
      form.setValue("topic", "");
      form.setValue("tone", "");
      // Reset Ask AI state when leaving Ask AI mode
      setAskAiInput("");
      setAiSuggestions([]);
      setShowSuggestionDropdown(false);
    }
    
    // Clear generated content for all input method switches
    setGeneratedPost("");
    setEditedPost("");
    setEditMode(false);
    setChangeRequest("");
    setSelectedDate(undefined);
  }, [topicType, form]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5 data-grid bg-noise p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium animate-data-pulse">
            <Sparkles className="h-4 w-4" />
            AI-Powered Content Creation
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent animate-pulse-glow">
            Create LinkedIn Posts
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate engaging, professional LinkedIn content that resonates with your audience using Gemini AI
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 drop-shadow-glow" />
                  Post Configuration
                </CardTitle>
                <CardDescription>
                  Define your content parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Post Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Post Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 futuristic-border">
                                <SelectValue placeholder="Choose your content type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                              {categories.map(category => (
                                <SelectItem key={category} value={category} className="py-3">
                                  <div className="text-sm">
                                    {category}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Topic Type Toggle */}
                    <FormField
                      control={form.control}
                      name="topicType"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-base font-medium">Input Method</FormLabel>
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-3 w-full"
                          >
                            <ToggleGroupItem
                              value="text"
                              className="text-xs p-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <div className="text-center">
                                <div className="font-medium">Text Input</div>
                                {/* <div className="text-[10px] opacity-70">Direct entry</div> */}
                              </div>
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="askai"
                              className="text-xs p-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <div className="text-center">
                                <div className="font-medium">Ask AI</div>
                                {/* <div className="text-[10px] opacity-70">AI suggestions</div> */}
                              </div>
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="url"
                              className="text-xs p-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <div className="text-center">
                                <div className="font-medium">URL Input</div>
                                {/* <div className="text-[10px] opacity-70">Analyze content</div> */}
                              </div>
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </FormItem>
                      )}
                    />

                    {/* Ask AI Section */}
                    {topicType === "askai" && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <Label className="text-base font-medium">AI Query</Label>
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Ask AI for topic suggestions (e.g., 'Give me post ideas about leadership challenges for new managers')"
                              value={askAiInput}
                              onChange={(e) => setAskAiInput(e.target.value)}
                              className="min-h-[80px] resize-none futuristic-border"
                              disabled={isLoadingAiSuggestions}
                            />
                            <Button
                              type="button"
                              onClick={handleAskAI}
                              disabled={isLoadingAiSuggestions || !askAiInput.trim() || !form.getValues("category")}
                              className="w-full h-10 gap-2 futuristic-border glow-hover"
                              variant="outline"
                            >
                              {isLoadingAiSuggestions ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Getting AI Suggestions...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4" />
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* AI Suggestions Dropdown */}
                        {showSuggestionDropdown && aiSuggestions.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Select a suggestion:</Label>
                            <Select onValueChange={(value) => {
                              const suggestion = aiSuggestions.find(s => s.title === value);
                              if (suggestion) {
                                handleSuggestionSelect(suggestion);
                              }
                            }}>
                              <SelectTrigger className="h-12 futuristic-border">
                                <SelectValue placeholder="Choose from AI suggestions..." />
                              </SelectTrigger>
                              <SelectContent className="bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                                {aiSuggestions.map((suggestion, index) => (
                                  <SelectItem key={index} value={suggestion.title} className="py-3">
                                    <div className="text-sm">
                                      {suggestion.title}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Topic Input */}
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => {
                        const urlValidation = topicType === "url" ? validateUrlRealTime(field.value) : {
                          isValid: true,
                          message: ""
                        };
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              {topicType === "url" ? "Content URL" : "Topic or Idea"}
                            </FormLabel>
                            <FormControl>
                              {topicType === "url" ? (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Input
                                      placeholder="https://www.youtube.com/watch?v=example"
                                      className={cn(
                                        "h-12 text-base futuristic-border",
                                        !urlValidation.isValid && field.value.trim() && "border-destructive focus-visible:ring-destructive"
                                      )}
                                      value={field.value}
                                      onChange={field.onChange}
                                      onBlur={(e) => {
                                        if (e.target.value.trim()) {
                                          const formatted = formatUrl(e.target.value);
                                          field.onChange(formatted);
                                        }
                                      }}
                                    />
                                    {field.value.trim() && (
                                      <div className={cn(
                                        "absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
                                        urlValidation.isValid ? "bg-green-500" : "bg-destructive"
                                      )} />
                                    )}
                                  </div>
                                  {!urlValidation.isValid && field.value.trim() && (
                                    <p className="text-sm text-destructive">{urlValidation.message}</p>
                                  )}
                                </div>
                              ) : (
                                <Textarea
                                  placeholder="Describe your topic, key points, or the message you want to convey..."
                                  className="min-h-[100px] resize-none futuristic-border"
                                  {...field}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Post Tone */}
                    <FormField
                      control={form.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Writing Tone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 futuristic-border">
                                <SelectValue placeholder="Select your preferred tone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                              {tones.map(tone => (
                                <SelectItem key={tone} value={tone} className="py-3">
                                  {tone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Create Button */}
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium shadow-lg border-2 futuristic-border glow-hover"
                      disabled={isGenerating || (topicType === "askai" && (!form.getValues("topic") || !form.getValues("tone")))}
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating Amazing Content...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Generate LinkedIn Post
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Content Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generated Post Display */}
            <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl border-0 bg-card/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg animate-data-pulse">
                      <Edit className="h-5 w-5 text-primary drop-shadow-glow" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Generated Content</CardTitle>
                      <CardDescription>
                        Your AI-generated LinkedIn post
                      </CardDescription>
                    </div>
                  </div>
                  {generatedPost && (
                    <div className="flex gap-2">
                      {editMode && (
                        <Badge variant="secondary" className="animate-pulse-glow">
                          <Edit className="w-3 h-3 mr-1" />
                          Editing
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2 shadow-sm futuristic-border glow-hover">
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[400px] max-h-[500px] overflow-y-auto rounded-xl border-2 border-dashed border-red-500/20 bg-gradient-to-br from-muted/30 to-red-500/5 p-6 relative">
                  {/* Scanning line effect */}
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-300 to-transparent animate-scan"></div>
                  </div>
                  
                  {generatedPost ? (
                    <div className="space-y-4">
                      {editMode ? (
                        <Textarea
                          value={editedPost}
                          onChange={(e) => setEditedPost(e.target.value)}
                          className="min-h-[350px] border-none bg-transparent p-0 text-base leading-relaxed resize-none focus-visible:ring-0 shadow-none relative z-10"
                          placeholder="Edit your post content here..."
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground relative z-10">
                          {generatedPost}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                      <div className="p-4 bg-muted/50 rounded-full animate-float">
                        <Sparkles className="h-12 w-12 text-muted-foreground animate-pulse-glow" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-muted-foreground">Ready to Create Amazing Content?</h3>
                        <p className="text-muted-foreground max-w-md">
                          Fill out the form on the left with your topic and preferences, then click "Generate" to create your LinkedIn post
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 animate-pulse" />
                          AI-Powered
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                          Professional
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                          Engaging
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {generatedPost && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={handleEditToggle}
                  className="h-12 gap-2 shadow-lg border-2 futuristic-border glow-hover"
                  size="lg"
                >
                  <Edit className="h-5 w-5 drop-shadow-glow" />
                  {editMode ? "Save Changes" : "Edit Post"}
                </Button>
                
                {/* Save to Library Dialog */}
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleSaveDialogOpen}
                      className="h-12 gap-2 shadow-lg border-2 futuristic-border glow-hover"
                      size="lg"
                    >
                      <Save className="h-5 w-5 drop-shadow-glow" />
                      Save to Library
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Save to Post Library</DialogTitle>
                      <DialogDescription className="text-base">
                        Add your post to the library for easy access and management
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-6">
                      <div className="space-y-2">
                        <Label htmlFor="post-title">Post Title *</Label>
                        <Input
                          id="post-title"
                          placeholder="Enter a descriptive title..."
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          className="futuristic-border"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="post-platform">Platform</Label>
                        <Select value={postPlatform} onValueChange={setPostPlatform}>
                          <SelectTrigger className="futuristic-border">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                            <SelectItem value="Twitter">Twitter</SelectItem>
                            <SelectItem value="Facebook">Facebook</SelectItem>
                            <SelectItem value="Instagram">Instagram</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex gap-2">
                          <Input
                            value={customTag}
                            onChange={(e) => setCustomTag(e.target.value)}
                            placeholder="Add a tag"
                            className="futuristic-border"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag();
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={addCustomTag} className="futuristic-border glow-hover">
                            Add
                          </Button>
                        </div>
                        {selectedTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => removeTag(tag)}
                              >
                                {tag} ×
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="futuristic-border glow-hover">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveToLibrary} disabled={isSaving || !postTitle.trim()} className="futuristic-border glow-hover">
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save to Library
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Schedule Post Dialog */}
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleScheduleDialogOpen}
                      className="h-12 gap-2 shadow-lg border-2 futuristic-border glow-hover"
                      size="lg"
                    >
                      <Calendar className="h-5 w-5 drop-shadow-glow" />
                      Schedule Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Schedule Your Post</DialogTitle>
                      <DialogDescription className="text-base">
                        Choose when to publish your content
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto grid gap-4 py-6 pr-2">
                      <div className="space-y-2">
                        <Label htmlFor="schedule-title">Post Title *</Label>
                        <Input
                          id="schedule-title"
                          placeholder="Enter a descriptive title..."
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          className="futuristic-border"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="schedule-platform">Platform</Label>
                          <Select value={postPlatform} onValueChange={setPostPlatform}>
                            <SelectTrigger className="futuristic-border">
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover backdrop-blur-md border shadow-lg futuristic-border">
                              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                              <SelectItem value="Twitter">Twitter</SelectItem>
                              <SelectItem value="Facebook">Facebook</SelectItem>
                              <SelectItem value="Instagram">Instagram</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="schedule-time">Time</Label>
                          <Input
                            id="schedule-time"
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="futuristic-border"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Date</Label>
                        <CalendarComponent
                          mode="single" 
                          selected={selectedDate} 
                          onSelect={setSelectedDate} 
                          className="rounded-lg border mx-auto pointer-events-auto futuristic-border"
                          disabled={(date) => date < new Date()}
                        />
                      </div>

                      {selectedDate && (
                        <div className="p-4 bg-muted/50 rounded-lg futuristic-border">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-primary animate-pulse" />
                            <span>Scheduled for: {format(selectedDate, "PPP")} at {selectedTime}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex gap-2">
                          <Input
                            value={customTag}
                            onChange={(e) => setCustomTag(e.target.value)}
                            placeholder="Add a tag"
                            className="futuristic-border"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomTag();
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={addCustomTag} className="futuristic-border glow-hover">
                            Add
                          </Button>
                        </div>
                        {selectedTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => removeTag(tag)}
                              >
                                {tag} ×
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter className="gap-2 flex-shrink-0 border-t pt-4">
                      <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} className="futuristic-border glow-hover">
                        Cancel
                      </Button>
                      <Button onClick={handleSchedulePost} disabled={isScheduling || !postTitle.trim() || !selectedDate} className="futuristic-border glow-hover">
                        {isScheduling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Scheduling...
                          </>
                        ) : (
                          <>
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule Post
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Refinement Section */}
            {generatedPost && (
              <Card className="futuristic-border glow-hover backdrop-blur-sm shadow-xl border-0 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Refine Your Content</CardTitle>
                  <CardDescription>
                    Not quite right? Tell us what you'd like to change
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Example: Make it more casual, add more emojis, focus on the benefits, make it shorter..."
                    value={changeRequest}
                    onChange={(e) => setChangeRequest(e.target.value)}
                    className="min-h-[120px] text-base futuristic-border"
                  />
                  
                  <Button
                    onClick={handleResubmit}
                    disabled={isResubmitting || !changeRequest.trim()}
                    className="w-full h-12 text-base shadow-lg border-2 futuristic-border glow-hover"
                    size="lg"
                  >
                    {isResubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Refining Content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Refine Post
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}