import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addAddress, changePassword, updateProfile } from '../features/auth/authSlice';
import { Input } from '../components/ui/Field';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Display';
import { ErrorState } from '../components/ui/Feedback';

const emptyAddress = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', postalCode: '', country: 'Indonesia', isDefault: false };

export default function AccountPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [address, setAddress] = useState(emptyAddress);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const run = async (thunk) => {
    setError('');
    setMessage('');
    try {
      await dispatch(thunk()).unwrap();
      setMessage('Saved successfully.');
    } catch (failure) {
      setError(failure);
    }
  };

  return (
    <div className="page-shell py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">Hello, {user.name}</h1>
        <p className="mt-1 text-sm text-muted">{user.email} · <Badge tone={user.role}>{user.role}</Badge></p>
      </div>

      {error && <div className="mt-6"><ErrorState message={error} /></div>}
      {message && <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Profile</h2>
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); run(() => updateProfile(profile)); }}>
            <Input id="profile-name" label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input id="profile-email" label="Email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <Button type="submit" variant="secondary">Update profile</Button>
          </form>
        </section>

        <section className="surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Change password</h2>
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); run(() => changePassword(passwords)); setPasswords({ currentPassword: '', newPassword: '' }); }}>
            <Input id="current-password" label="Current password" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
            <Input id="new-password" label="New password" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
            <Button type="submit" variant="secondary">Change password</Button>
          </form>
        </section>
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Addresses</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(user.addresses || []).map((entry) => (
            <div key={entry._id} className="rounded-md border border-line p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{entry.label}</span>
                {entry.isDefault && <Badge tone="default">Default</Badge>}
              </div>
              <p className="mt-2 text-muted">{entry.fullName}<br />{entry.line1}<br />{entry.city} {entry.postalCode}<br />{entry.phone}</p>
            </div>
          ))}
        </div>
        <form className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); run(() => addAddress(address)); setAddress(emptyAddress); }}>
          <Input id="addr-name" label="Full name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
          <Input id="addr-phone" label="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
          <div className="sm:col-span-2"><Input id="addr-line" label="Street address" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} /></div>
          <Input id="addr-city" label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
          <Input id="addr-postal" label="Postal code" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={address.isDefault} onChange={(e) => setAddress({ ...address, isDefault: e.target.checked })} />
            Set as default address
          </label>
          <div className="sm:col-span-2"><Button type="submit" variant="secondary">Add address</Button></div>
        </form>
      </section>
    </div>
  );
}
