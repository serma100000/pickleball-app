// Utility functions
export { cn } from './lib/utils';

// Base components
export {
  Button,
  buttonVariants,
  type ButtonProps,
} from './components/button';

export {
  Input,
  inputVariants,
  type InputProps,
} from './components/input';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  type CardProps,
  type CardHeaderProps,
  type CardFooterProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
} from './components/card';

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarWithFallback,
  getInitials,
  type AvatarProps,
  type AvatarImageProps,
  type AvatarFallbackProps,
  type AvatarWithFallbackProps,
} from './components/avatar';

export {
  Badge,
  badgeVariants,
  type BadgeProps,
} from './components/badge';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  type DialogOverlayProps,
  type DialogContentProps,
  type DialogHeaderProps,
  type DialogFooterProps,
  type DialogTitleProps,
  type DialogDescriptionProps,
} from './components/dialog';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  type SelectTriggerProps,
  type SelectContentProps,
  type SelectLabelProps,
  type SelectItemProps,
  type SelectSeparatorProps,
  type SelectScrollUpButtonProps,
  type SelectScrollDownButtonProps,
} from './components/select';

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
} from './components/tabs';

export {
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  toastVariants,
  type ToastProps,
  type ToastViewportProps,
  type ToastActionProps,
  type ToastCloseProps,
  type ToastTitleProps,
  type ToastDescriptionProps,
} from './components/toast';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  type DropdownMenuSubTriggerProps,
  type DropdownMenuSubContentProps,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuRadioItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSeparatorProps,
  type DropdownMenuShortcutProps,
} from './components/dropdown-menu';

export {
  Spinner,
  SpinnerOverlay,
  spinnerVariants,
  type SpinnerProps,
  type SpinnerOverlayProps,
} from './components/spinner';

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonAvatarProps,
  type SkeletonCardProps,
} from './components/skeleton';

export {
  EmptyState,
  type EmptyStateProps,
} from './components/empty-state';

export {
  Stat,
  StatCard,
  type StatProps,
  type StatCardProps,
} from './components/stat';

// Pickleball-specific components
export {
  RatingBadge,
  SkillLevelBadge,
  ratingBadgeVariants,
  getSkillLevel,
  getSkillLevelLabel,
  type RatingBadgeProps,
  type SkillLevelBadgeProps,
  type SkillLevel,
} from './components/rating-badge';

export {
  GameScore,
  MatchScore,
  type GameScoreProps,
  type MatchScoreProps,
} from './components/game-score';

export {
  PlayerCard,
  PlayerListItem,
  type PlayerCardProps,
  type PlayerListItemProps,
} from './components/player-card';

export {
  CourtCard,
  CourtListItem,
  type CourtCardProps,
  type CourtListItemProps,
  type CourtAmenity,
} from './components/court-card';

export {
  MatchCard,
  type MatchCardProps,
  type MatchStatus,
  type MatchType,
  type MatchPlayer,
  type MatchTeam,
} from './components/match-card';
