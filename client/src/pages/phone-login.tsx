import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookOpen, Phone, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const phoneSchema = z.object({
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\+\(\)]+$/, "Please enter a valid phone number"),
});

const verifySchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
  firstName: z.string().optional(),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

export default function PhoneLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "" },
  });

  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema.extend({
      firstName: isNewUser 
        ? z.string().min(1, "Please enter your name")
        : z.string().optional(),
    })),
    defaultValues: { code: "", firstName: "" },
  });

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const startResendCountdown = useCallback(() => {
    setResendCountdown(60);
  }, []);

  const sendCodeMutation = useMutation({
    mutationFn: async (data: PhoneFormData) => {
      const response = await apiRequest("POST", "/api/auth/send-code", {
        phoneNumber: data.phoneNumber,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPhoneNumber(phoneForm.getValues("phoneNumber"));
      setIsNewUser(data.isNewUser);
      setStep("verify");
      startResendCountdown();
      toast({
        title: "Code Sent",
        description: "Check your phone for the verification code",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: VerifyFormData) => {
      const response = await apiRequest("POST", "/api/auth/verify-code", {
        phoneNumber,
        code: data.code,
        firstName: data.firstName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome!",
        description: data.needsOnboarding 
          ? "Let's set up your account"
          : "You're signed in",
      });
      if (data.needsOnboarding) {
        setLocation("/onboarding");
      } else {
        setLocation("/");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Invalid or expired verification code",
        variant: "destructive",
      });
    },
  });

  const handlePhoneSubmit = (data: PhoneFormData) => {
    sendCodeMutation.mutate(data);
  };

  const handleVerifySubmit = (data: VerifyFormData) => {
    verifyCodeMutation.mutate(data);
  };

  const handleResendCode = () => {
    if (phoneNumber && resendCountdown === 0) {
      sendCodeMutation.mutate({ phoneNumber });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold">Osmosify</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {step === "phone" ? "Sign In" : "Verify Your Phone"}
            </CardTitle>
            <CardDescription>
              {step === "phone" 
                ? "Enter your phone number to continue"
                : isNewUser 
                  ? "Enter the code we sent and your name"
                  : "Enter the verification code we sent you"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="tel"
                              placeholder="(555) 123-4567"
                              className="pl-10"
                              data-testid="input-phone-number"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={sendCodeMutation.isPending}
                    data-testid="button-send-code"
                  >
                    {sendCodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...verifyForm}>
                <form onSubmit={verifyForm.handleSubmit(handleVerifySubmit)} className="space-y-4">
                  <FormField
                    control={verifyForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="123456"
                            className="text-center text-2xl tracking-widest"
                            data-testid="input-verification-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isNewUser && (
                    <FormField
                      control={verifyForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter your first name"
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={verifyCodeMutation.isPending}
                    data-testid="button-verify-code"
                  >
                    {verifyCodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify and Continue"
                    )}
                  </Button>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleResendCode}
                      disabled={resendCountdown > 0 || sendCodeMutation.isPending}
                      data-testid="button-resend-code"
                    >
                      {sendCodeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {resendCountdown > 0 
                        ? `Resend code in ${resendCountdown}s`
                        : "Resend Code"
                      }
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setStep("phone")}
                      data-testid="button-back-to-phone"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Use a different number
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
