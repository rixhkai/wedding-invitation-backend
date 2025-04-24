import { createContext, useContext, type FC } from 'hono/jsx'
import type { User } from '../../model/data.js'

const themes = {
  light: {
    color: '#000000',
    background: '#eeeeee',
  },
  dark: {
    color: '#ffffff',
    background: '#222222',
  },
}

const ThemeContext = createContext(themes.light)

const Layout: FC = (props) => {
  return (
    <html>
      <body>{props.children}</body>
    </html>
  )
}

const Top: FC<{ messages: string[] }> = (props: {
  messages: string[]
}) => {
  return (
    <Layout>
      <h1>Hello Hono!</h1>
      <ul>
        {props.messages.map((message) => {
          return <li>{message}!!</li>
        })}
      </ul>
    </Layout>
  )
}

const FormListUser: FC = () => {
  const theme = useContext(ThemeContext);
  return (
    <Layout>
      <div style={theme}>
        <div style={{display: 'flex', 'align-item': 'center'}}>
          <div style={{}}>ID</div>
          <div style={{}}>Name</div>
          <div style={{}}>Email</div>
          <div style={{}}>Phone</div>
        </div>
      </div>
    </Layout>
  )
}

const Items: FC<{ user: User }> = (props: {
  user: User
}) => {
  const theme = useContext(ThemeContext);
  return (
    props.user ?
    <div>
      <div style={theme}>
        <div style={{display: 'flex', 'align-item': 'center'}}>
          <div style={{}}>{props.user.id}</div>
          <div style={{}}>{props.user.name}</div>
          <div style={{}}>{props.user.email}</div>
          <div style={{}}>{props.user.phone}</div>
        </div>
      </div>
    </div> :
    <div>Error Fetch User</div>
  )
}