import React, { useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { ReviewDialog } from './ReviewDialog';
import { StarRatingInput } from './StarRating';
import { ReviewImagePicker } from './ReviewImagePicker';
import { createProductReview, updateMyReview } from '../../service/reviews';
import { toReviewApiError } from '../../service/reviewErrors';
import { invalidateMyReviews } from '../../hooks/useMyReviews';
import { MY_REVIEWS_PATH, REVIEW_LIMITS } from '../../config/reviews';
import type { CustomerReview, ReviewApiError } from '../../types/reviews';

interface ProductInfo {
  name?: string;
  image?: string;
}

export type ReviewFormTarget =
  | { mode: 'create'; productId: string; orderId: string; variantId?: string; product?: ProductInfo }
  | { mode: 'edit'; review: CustomerReview; product?: ProductInfo };

interface ReviewFormModalProps {
  /** null = closed */
  target: ReviewFormTarget | null;
  onClose: () => void;
  /** Called after a successful create / edit (the cache is already invalidated) */
  onSaved?: (mode: 'create' | 'edit') => void;
}

type Field = 'rating' | 'title' | 'comment';
type FieldErrors = Partial<Record<Field | 'images', string>>;

interface FormError {
  message: string;
  /** 409 on create: offer a link to My Reviews */
  showMyReviewsLink?: boolean;
}

const validateField = (field: Field, values: { rating: number; title: string; comment: string }): string => {
  if (field === 'rating') {
    return values.rating >= REVIEW_LIMITS.ratingMin && values.rating <= REVIEW_LIMITS.ratingMax ? '' : 'Please choose a star rating.';
  }
  if (field === 'title') {
    if (!values.title.trim()) return 'Please add a title.';
    if (values.title.length > REVIEW_LIMITS.titleMax) return `Title must be ${REVIEW_LIMITS.titleMax} characters or fewer.`;
    return '';
  }
  if (!values.comment.trim()) return 'Please write a few words about the product.';
  if (values.comment.length > REVIEW_LIMITS.commentMax) return `Review must be ${REVIEW_LIMITS.commentMax} characters or fewer.`;
  return '';
};

/**
 * Write / edit a review. Remount it (key) per target so state starts fresh.
 * Create → POST multipart; edit → PATCH JSON (rating, title, comment; photos are read-only).
 */
export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({ target, onClose, onSaved }) => {
  const { showToast } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = target?.mode === 'edit';
  const initial = target?.mode === 'edit' ? target.review : null;

  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [images, setImages] = useState<File[]>([]);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  const ratingLabelId = useId();
  const titleId = useId();
  const commentId = useId();
  const formId = useId();

  const values = { rating, title, comment };
  const product = target?.product;

  const close = () => {
    if (submitting.current) return;
    onClose();
  };

  const blur = (field: Field) => {
    setTouched(t => ({ ...t, [field]: true }));
    setErrors(e => ({ ...e, [field]: validateField(field, values) }));
  };

  /** Re-validate a field as the user types, but only once it has been touched */
  const revalidate = (field: Field, next: Partial<typeof values>) => {
    if (touched[field] || errors[field]) {
      setErrors(e => ({ ...e, [field]: validateField(field, { ...values, ...next }) }));
    }
  };

  const validateAll = (): boolean => {
    const next: FieldErrors = {
      rating: validateField('rating', values),
      title: validateField('title', values),
      comment: validateField('comment', values),
    };
    setErrors(next);
    setTouched({ rating: true, title: true, comment: true });
    const firstInvalid = (['rating', 'title', 'comment'] as Field[]).find(f => next[f]);
    if (firstInvalid === 'title') document.getElementById(titleId)?.focus();
    else if (firstInvalid === 'comment') document.getElementById(commentId)?.focus();
    return !firstInvalid;
  };

  const handleApiError = (apiError: ReviewApiError) => {
    switch (apiError.kind) {
      case 'validation': {
        const fe = apiError.fieldErrors;
        const mapped: FieldErrors = { rating: fe.rating, title: fe.title, comment: fe.comment, images: fe.images };
        setErrors(mapped);
        const hasFieldError = Object.values(mapped).some(Boolean);
        setFormError(hasFieldError ? null : { message: apiError.message });
        break;
      }
      case 'duplicate':
        setFormError({ message: apiError.message, showMyReviewsLink: true });
        invalidateMyReviews();
        break;
      case 'unauthorized':
        // The API client has already ended the session (ShopContext shows its own toast)
        onClose();
        navigate('/auth/login', { state: { from: location } });
        break;
      default:
        // not-eligible (403), forbidden, not-found, network, server, rate-limited
        setFormError({ message: apiError.message });
    }
  };

  const save = async () => {
    if (!target || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (target.mode === 'create') {
        await createProductReview(target.productId, {
          orderId: target.orderId,
          variantId: target.variantId,
          rating,
          title,
          comment,
          images,
        });
        showToast('Thanks! Your review has been posted', 'success');
      } else {
        await updateMyReview(target.review.id, { rating, title, comment });
        showToast('Your review has been updated', 'success');
      }
      // Status is never assumed: the caches reload and the public list shows the
      // review only if the backend returns it as approved.
      invalidateMyReviews();
      submitting.current = false;
      onSaved?.(target.mode);
      onClose();
    } catch (error) {
      handleApiError(toReviewApiError(error, target.mode === 'create' ? 'create' : 'edit', 'Could not save your review.'));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || !validateAll()) return;
    void save();
  };

  const fieldClass = (invalid: boolean) =>
    `w-full p-3 bg-allura-bg/40 border rounded-xl text-sm font-sans text-allura-text focus:outline-none ${
      invalid ? 'border-rose-400 focus:border-rose-500' : 'border-allura-border focus:border-allura-gold'
    }`;

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      <button
        type="button"
        onClick={close}
        disabled={isSubmitting}
        className="min-h-11 px-4 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-muted hover:text-allura-text disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isSubmitting}
        className="min-h-11 px-5 inline-flex items-center justify-center gap-2 bg-allura-darkBrown hover:bg-allura-darkBrown/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={14} className="animate-spin" />}
        <span>{isSubmitting ? 'Submitting…' : isEdit ? 'Save changes' : 'Submit review'}</span>
      </button>
    </div>
  );

  return (
    <ReviewDialog
      isOpen={!!target}
      onClose={close}
      title={isEdit ? 'Edit your review' : 'Write a review'}
      fullScreenOnMobile
      footer={footer}
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-5">
        {(product?.name || product?.image) && (
          <div className="flex items-center gap-3 p-3 bg-allura-bg/40 border border-allura-border rounded-xl">
            {product.image && (
              <img src={product.image} alt="" className="w-12 h-14 object-cover rounded-lg bg-allura-bg flex-shrink-0" />
            )}
            {product.name && <p className="text-sm font-serif text-allura-text line-clamp-2">{product.name}</p>}
          </div>
        )}

        {/* Rating */}
        <div className="space-y-1.5">
          <p id={ratingLabelId} className="text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider">
            Your rating *
          </p>
          <StarRatingInput
            value={rating}
            onChange={next => {
              setRating(next);
              setErrors(e => ({ ...e, rating: '' }));
            }}
            onBlur={() => blur('rating')}
            labelId={ratingLabelId}
            errorId={errors.rating ? `${ratingLabelId}-error` : undefined}
            invalid={!!errors.rating}
            disabled={isSubmitting}
          />
          {errors.rating && (
            <p id={`${ratingLabelId}-error`} className="text-[11px] font-sans font-medium text-rose-700">
              {errors.rating}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor={titleId} className="block text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider">
            Title *
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            maxLength={REVIEW_LIMITS.titleMax}
            onChange={e => {
              setTitle(e.target.value);
              revalidate('title', { title: e.target.value });
            }}
            onBlur={() => blur('title')}
            disabled={isSubmitting}
            aria-invalid={!!errors.title}
            aria-describedby={`${titleId}-count${errors.title ? ` ${titleId}-error` : ''}`}
            placeholder="Sum it up in a line"
            className={`${fieldClass(!!errors.title)} min-h-11`}
          />
          <div className="flex justify-between gap-2 text-[11px] font-sans">
            <span id={`${titleId}-error`} className="text-rose-700 font-medium">
              {errors.title}
            </span>
            <span id={`${titleId}-count`} className="text-allura-muted tabular-nums flex-shrink-0">
              {title.length}/{REVIEW_LIMITS.titleMax}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-1.5">
          <label htmlFor={commentId} className="block text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider">
            Your review *
          </label>
          <textarea
            id={commentId}
            rows={6}
            value={comment}
            maxLength={REVIEW_LIMITS.commentMax}
            onChange={e => {
              setComment(e.target.value);
              revalidate('comment', { comment: e.target.value });
            }}
            onBlur={() => blur('comment')}
            disabled={isSubmitting}
            aria-invalid={!!errors.comment}
            aria-describedby={`${commentId}-count${errors.comment ? ` ${commentId}-error` : ''}`}
            placeholder="How was the fit, fabric and finish?"
            className={`${fieldClass(!!errors.comment)} resize-y`}
          />
          <div className="flex justify-between gap-2 text-[11px] font-sans">
            <span id={`${commentId}-error`} className="text-rose-700 font-medium">
              {errors.comment}
            </span>
            <span id={`${commentId}-count`} className="text-allura-muted tabular-nums flex-shrink-0">
              {comment.length}/{REVIEW_LIMITS.commentMax}
            </span>
          </div>
        </div>

        {/* Photos */}
        {isEdit ? (
          initial && initial.images.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider">Photos</p>
              <ul className="flex flex-wrap gap-2">
                {initial.images.map((img, idx) => (
                  <li key={`${img.url}-${idx}`} className="w-20 h-20 rounded-xl overflow-hidden border border-allura-border bg-allura-bg">
                    <img src={img.thumbnailUrl} alt={img.alt || `Your review photo ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                  </li>
                ))}
              </ul>
              <p className="text-[11px] font-sans text-allura-muted">Photos can't be changed after posting.</p>
            </div>
          )
        ) : (
          <ReviewImagePicker files={images} onChange={setImages} disabled={isSubmitting} serverError={errors.images} />
        )}

        {formError && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-sans space-y-1">
            <p>{formError.message}</p>
            {formError.showMyReviewsLink && (
              <Link to={MY_REVIEWS_PATH} onClick={onClose} className="inline-block font-bold underline">
                Go to My Reviews
              </Link>
            )}
          </div>
        )}
      </form>
    </ReviewDialog>
  );
};

export default ReviewFormModal;
